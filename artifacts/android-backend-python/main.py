from __future__ import annotations

import io
import json
import os
import re
from datetime import datetime, timedelta, timezone
from typing import List, Literal, Optional
from uuid import uuid4

import cv2
import firebase_admin
import google.generativeai as genai
import httpx
import jwt
import numpy as np
import pytesseract
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials, firestore, messaging
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from pydantic import BaseModel, Field
from rapidfuzz import fuzz

app = FastAPI(title="Discharge Buddy Backend", version="1.0.0")
scheduler = BackgroundScheduler(timezone="UTC")
db: firestore.Client | None = None

Role = Literal["patient", "caregiver", "both", "user"]
DoseStatus = Literal["taken", "missed", "delayed"]
RiskLevel = Literal["low", "medium", "high"]

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGO = "HS256"
JWT_TTL_HOURS = int(os.getenv("JWT_TTL_HOURS", "72"))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# LLM setup for Feature 12 & 14
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class OAuthLoginRequest(BaseModel):
    id_token: str
    role: Role


class LinkRequest(BaseModel):
    caregiver_id: str
    patient_id: str


class DoseEventRequest(BaseModel):
    patient_id: str
    medicine_name: str
    scheduled_time: str
    status: DoseStatus


class RiskRequest(BaseModel):
    patient_id: str
    symptoms: List[str] = Field(default_factory=list)
    severity: int = 0


class EmergencyRequest(BaseModel):
    patient_id: str
    reason: str


class AssistantRequest(BaseModel):
    message: str


class DeviceTokenRequest(BaseModel):
    fcm_token: str


class PrescriptionProcessRequest(BaseModel):
    patient_id: str
    extracted_text: str


class LearnCorrectionRequest(BaseModel):
    raw_text: str
    correct_medicine_name: str


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_db() -> firestore.Client:
    if db is None:
        raise HTTPException(status_code=503, detail="Database not initialized")
    return db


def issue_jwt(uid: str, role: Role, email: str) -> str:
    payload = {
        "sub": uid,
        "role": role,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_jwt(auth_header: str = Header(..., alias="Authorization")) -> dict:
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")
    token = auth_header.replace("Bearer ", "", 1)
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

def check_access(requester_id: str, target_patient_id: str, firestore_client: firestore.Client) -> None:
    # 1. User is accessing their own data (Acting as Patient)
    if requester_id == target_patient_id:
        return 
    # 2. User is accessing linked data (Acting as Caregiver)
    link_ref = firestore_client.collection("caregiver_links").document(f"{requester_id}_{target_patient_id}").get()
    if not link_ref.exists:
        raise HTTPException(status_code=403, detail="Unauthorized: You are neither the patient nor an authorized caregiver for this account.")


def extract_text_from_image_bytes(raw: bytes) -> str:
    arr = np.frombuffer(raw, np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Unreadable image")
    
    # 1. Grayscale conversion
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # 2. Rescaling for better OCR readability
    gray = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
    
    # 3. Denoise
    denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
    
    # 4. Adaptive Thresholding (robust against uneven lighting in photos)
    thresh = cv2.adaptiveThreshold(denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    
    return pytesseract.image_to_string(thresh, config="--oem 3 --psm 4").strip()


def simplify_instruction(text: str) -> str:
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(
                f"Convert this medical instruction to extremely simple, everyday language for a patient. Keep it under 10 words. Avoid complex terms. Text: '{text}'"
            )
            return response.text.replace("\n", "").strip()
        except Exception:
            pass # fallback if API call fails
    return text.replace("orally", "by mouth").replace("bid", "twice daily").replace("od", "once daily")


def parse_frequency(line: str) -> str:
    txt = line.lower()
    
    # Numeric Patterns (e.g. 1-0-1, 1-1-1)
    if re.search(r"1[ \-\.]?0[ \-\.]?1", txt):
        return "twice daily"
    if re.search(r"1[ \-\.]?1[ \-\.]?1", txt):
        return "thrice daily"
    if re.search(r"0[ \-\.]?0[ \-\.]?1", txt):
        return "once daily (night)"
    if re.search(r"1[ \-\.]?0[ \-\.]?0", txt):
        return "once daily (morning)"
        
    # Alpha Patterns (BD, OD, SOS)
    if re.search(r"\bbid\b|\bbd\b|\btwise\b|\btwice\b|2x", txt):
        return "twice daily"
    if re.search(r"\btid\b|\btds\b|\bthrice\b|3x", txt):
        return "thrice daily"
    if re.search(r"\bod\b|\bonce\b|1x", txt):
        return "once daily"
    if re.search(r"\bhs\b|\bbedtime\b|\bnight\b", txt):
        return "once daily (night)"
    if re.search(r"\bsos\b|\bemergency\b|\bneeded\b", txt):
        return "sos (as needed)"
        
    return "once daily"


def schedule_from_frequency(freq: str) -> List[str]:
    if freq == "twice daily":
        return ["08:00", "20:00"]
    if freq == "thrice daily":
        return ["08:00", "14:00", "20:00"]
    if freq == "once daily (night)":
        return ["21:00"]
    if freq == "once daily (morning)" or freq == "once daily":
        return ["08:00"]
    if freq == "sos (as needed)":
        return []
    return ["08:00"]


def detect_risk(missed_doses: int, symptoms: List[str], severity: int) -> RiskLevel:
    score = 0
    # 1. Symptom weighted scoring
    urgent_markers = ["chest pain", "breathing", "stroke", "faint", "seizure", "blood", "unconscious"]
    moderate_markers = ["fever", "pain", "dizzy", "nausea", "swelling", "vomiting"]
    
    for s in symptoms:
        s_lower = s.lower()
        if any(marker in s_lower for marker in urgent_markers):
            score += 50  # Instant High
        elif any(marker in s_lower for marker in moderate_markers):
            score += 15
        else:
            score += 5
            
    # 2. Missed Doses weighted scoring (Exponential Risk Curve)
    # 1 miss = 10, 2 miss = 40 (Med/High border), 3 miss = 90 (High)
    score += (missed_doses ** 2) * 10
    
    # 3. Severity self-report weighted scoring
    # Severity 1-10 scale
    score += severity * 3
    
    # Calculation
    if score >= 50:
        return "high"
    if score >= 25:
        return "medium"
    return "low"


def send_push_to_user(user_id: str, title: str, body: str) -> None:
    user_ref = get_db().collection("users").document(user_id).get()
    if not user_ref.exists:
        return
    data = user_ref.to_dict() or {}
    tokens = data.get("fcm_tokens", [])
    for token in tokens:
        message = messaging.Message(
            token=token,
            notification=messaging.Notification(title=title, body=body),
            data={"ts": now_iso()},
        )
        messaging.send(message)


def create_timeline_event(patient_id: str, event_type: str, message: str) -> None:
    get_db().collection("timeline_events").document(f"evt-{uuid4()}").set(
        {"patient_id": patient_id, "type": event_type, "message": message, "created_at": now_iso()}
    )


def load_medicine_db() -> List[dict]:
    docs = get_db().collection("medicine_catalog").stream()
    medicines = [doc.to_dict() for doc in docs]
    if medicines:
        return medicines
    
    seed_path = os.path.join(os.path.dirname(__file__), "medicines_seed.json")
    if os.path.exists(seed_path):
        with open(seed_path, "r", encoding="utf-8") as f:
            seed = json.load(f)
    else:
        seed = [
            {"name": "Metformin", "aliases": ["metfornin", "metformin hcl"], "dosages": ["500mg", "850mg"], "instructions": "Take with meals.", "default_frequency": "BD"},
        ]
        
    for row in seed:
        get_db().collection("medicine_catalog").document(f"med-{uuid4()}").set(row)
    return seed


def match_medicine(token: str, medicine_db: List[dict]) -> dict:
    best = None
    score = 0.0
    candidate = token.lower().strip()
    
    # Fuzzy + Partial Match Logic (Killer Trick)
    for med in medicine_db:
        for term in [med["name"], *med.get("aliases", [])]:
            s_full = fuzz.ratio(candidate, term.lower())
            s_partial = fuzz.partial_ratio(candidate, term.lower())
            s = max(s_full, s_partial)
            
            if s > score:
                score = s
                best = med
                
    # Unknown Medicine Handling
    if score >= 60.0 and best:
        return {
            "name": best["name"], 
            "confidence": score, 
            "action": "auto_assigned", 
            "dosages": best.get("dosages", []),
            "instructions": best.get("instructions", ""),
            "default_frequency": best.get("default_frequency", "OD"),
            "is_recognized": True
        }
        
    # Unrecognized Pattern (Do not reject, pass for manual verification)
    return {
        "name": "Unrecognized",
        "raw_text": token,
        "confidence": score,
        "action": "ask_user_confirmation",
        "dosages": [],
        "instructions": "Please consult your doctor regarding instructions.",
        "default_frequency": "OD",
        "is_recognized": False
    }


def scheduler_process_notifications() -> None:
    firestore_client = get_db()
    now = datetime.now(timezone.utc)
    window_start = (now - timedelta(minutes=10)).isoformat()
    docs = (
        firestore_client.collection("dose_events")
        .where("status", "in", ["missed", "delayed"])
        .where("recorded_at", ">=", window_start)
        .stream()
    )
    for doc in docs:
        d = doc.to_dict()
        patient_id = d["patient_id"]
        links = (
            firestore_client.collection("caregiver_links")
            .where("patient_id", "==", patient_id)
            .stream()
        )
        for link in links:
            caregiver_id = link.to_dict()["caregiver_id"]
            # Caregiver Notification 
            send_push_to_user(caregiver_id, "Dose Alert", f"Patient missed/delayed dose: {d['medicine_name']}")

def scheduler_remind_patient() -> None:
    firestore_client = get_db()
    current_time_str = datetime.now(timezone.utc).strftime("%H:%M")
    
    docs = firestore_client.collection("prescriptions").stream()
    for doc in docs:
        rx = doc.to_dict()
        patient_id = rx["patient_id"]
        medicines = rx.get("medicines", [])
        
        for med in medicines:
            if current_time_str in med.get("times", []):
                # Patient Notification
                send_push_to_user(patient_id, "Medicine Time", f"Time to take {med['name']} ({med['dosage']})")


@app.on_event("startup")
def startup() -> None:
    global db
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET env is required")
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not cred_path:
        raise RuntimeError("GOOGLE_APPLICATION_CREDENTIALS env is required")
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    load_medicine_db()
    
    # Run Caregiver Missing Dose Alerts every 2 mins
    scheduler.add_job(scheduler_process_notifications, "interval", minutes=2, id="caregiver-alert-job")
    
    # Run Patient Medicine Reminders every minute
    scheduler.add_job(scheduler_remind_patient, "cron", minute="*", id="patient-reminder-job")
    
    scheduler.start()


@app.on_event("shutdown")
def shutdown() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)


@app.get("/healthz")
def healthz():
    return {"status": "ok", "time": now_iso()}


@app.post("/auth/google")
def auth_google(payload: OAuthLoginRequest, firestore_client: firestore.Client = Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID env missing")
    try:
        info = id_token.verify_oauth2_token(payload.id_token, google_requests.Request(), GOOGLE_CLIENT_ID)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Invalid Google token") from exc

    uid = info["sub"]
    email = info.get("email", "")
    name = info.get("name", "User")
    user_ref = firestore_client.collection("users").document(uid)
    existing = user_ref.get()
    data = {
        "id": uid,
        "email": email.lower(),
        "name": name,
        "role": payload.role if not existing.exists else (existing.to_dict() or {}).get("role", payload.role),
        "updated_at": now_iso(),
    }
    if not existing.exists:
        data["created_at"] = now_iso()
        data["fcm_tokens"] = []
    user_ref.set(data, merge=True)
    role: Role = data["role"]
    token = issue_jwt(uid, role, email)
    return {"token": token, "user": {"id": uid, "name": name, "email": email, "role": role}}


@app.post("/auth/device-token")
def upsert_device_token(payload: DeviceTokenRequest, claims: dict = Depends(decode_jwt), firestore_client: firestore.Client = Depends(get_db)):
    uid = claims["sub"]
    user_ref = firestore_client.collection("users").document(uid)
    user = user_ref.get()
    if not user.exists:
        raise HTTPException(status_code=404, detail="User not found")
    data = user.to_dict() or {}
    tokens = set(data.get("fcm_tokens", []))
    tokens.add(payload.fcm_token)
    user_ref.set({"fcm_tokens": list(tokens), "updated_at": now_iso()}, merge=True)
    return {"ok": True}


@app.post("/caregiver/link")
def caregiver_link(payload: LinkRequest, claims: dict = Depends(decode_jwt), firestore_client: firestore.Client = Depends(get_db)):
    caregiver_id = claims["sub"]
    if caregiver_id == payload.patient_id:
        raise HTTPException(status_code=400, detail="Cannot link yourself as your own caregiver")
        
    patient_doc = firestore_client.collection("users").document(payload.patient_id).get()
    if not patient_doc.exists:
        raise HTTPException(status_code=404, detail="Target Patient ID not found")
        
    link_ref = firestore_client.collection("caregiver_links").document(f"{caregiver_id}_{payload.patient_id}")
    link_ref.set({"caregiver_id": caregiver_id, "patient_id": payload.patient_id, "created_at": now_iso()})
    create_timeline_event(payload.patient_id, "link", "Caregiver linked")
    return {"ok": True, "caregiver_id": caregiver_id, "patient_id": payload.patient_id}


@app.post("/ocr/extract")
async def ocr_extract(image: UploadFile = File(...)):
    raw = await image.read()
    text = extract_text_from_image_bytes(raw)
    if not text:
        raise HTTPException(status_code=422, detail="No readable text found in prescription")
    normalized = " ".join(text.split())
    return {"raw_text": text, "normalized_text": normalized}


@app.post("/prescriptions/process")
def process_prescription(payload: PrescriptionProcessRequest, claims: dict = Depends(decode_jwt), firestore_client: firestore.Client = Depends(get_db)):
    requester = claims["sub"]
    check_access(requester, payload.patient_id, firestore_client)

    medicine_db = load_medicine_db()
    lines = [line.strip() for line in re.split(r"[\n,;]+", payload.extracted_text) if line.strip()]
    medicines = []
    
    for line in lines:
        first_token = line.split(" ")[0]
        match_result = match_medicine(first_token, medicine_db)
        
        # OCR-Independent Parsing: Grab dosage even if name failed
        dosage_match = re.search(r"\b\d+\s?(mg|mcg|ml|g|tab|puff)\b", line.lower())
        dosage = dosage_match.group(0) if dosage_match else (match_result["dosages"][0] if match_result["dosages"] else "as prescribed")
        
        # Pattern-based extraction
        frequency = parse_frequency(line)
        if frequency == "once daily" and match_result.get("default_frequency") == "BD": 
             # Use DB hint if Regex failed
             frequency = "twice daily"
             
        if not match_result["is_recognized"]:
             final_name = f"Unrecognized ({first_token})"
             instructions = "Please verify medicine name and instructions."
        else:
             final_name = match_result["name"]
             instructions = match_result["instructions"]

        medicines.append(
            {
                "name": final_name,
                "dosage": dosage,
                "frequency": frequency,
                "times": schedule_from_frequency(frequency),
                "instructions": instructions,
                "simplified_instructions": simplify_instruction(instructions),
                "action_required": match_result["action"]
            }
        )
        
    prescription_id = f"rx-{uuid4()}"
    firestore_client.collection("prescriptions").document(prescription_id).set(
        {
            "id": prescription_id,
            "patient_id": payload.patient_id,
            "source_text": payload.extracted_text,
            "medicines": medicines,
            "created_at": now_iso(),
        }
    )
    create_timeline_event(payload.patient_id, "prescription", "Prescription processed")
    return {"prescription_id": prescription_id, "patient_id": payload.patient_id, "medicines": medicines}


@app.post("/prescriptions/learn")
def learn_correction(payload: LearnCorrectionRequest, claims: dict = Depends(decode_jwt), firestore_client: firestore.Client = Depends(get_db)):
    # Learning System (Correction loop)
    # Find the target medicine in catalog
    docs = firestore_client.collection("medicine_catalog").where("name", "==", payload.correct_medicine_name).stream()
    target = next(docs, None)
    if not target:
        raise HTTPException(status_code=404, detail="Correct medicine not found in catalog")
        
    doc_ref = target.reference
    data = target.to_dict()
    aliases = set(data.get("aliases", []))
    aliases.add(payload.raw_text.lower().strip())
    
    doc_ref.update({"aliases": list(aliases)})
    return {"ok": True, "message": f"Learned mapping: {payload.raw_text} -> {payload.correct_medicine_name}"}


@app.post("/dose-events")
def dose_event(payload: DoseEventRequest, claims: dict = Depends(decode_jwt), firestore_client: firestore.Client = Depends(get_db)):
    check_access(claims["sub"], payload.patient_id, firestore_client)
    event_id = f"dose-{uuid4()}"
    body = {
        "id": event_id,
        "patient_id": payload.patient_id,
        "medicine_name": payload.medicine_name,
        "scheduled_time": payload.scheduled_time,
        "status": payload.status,
        "recorded_at": now_iso(),
    }
    firestore_client.collection("dose_events").document(event_id).set(body)
    create_timeline_event(payload.patient_id, "dose", f"{payload.medicine_name} marked {payload.status}")
    return body


@app.post("/risk/analyze")
def risk_analyze(payload: RiskRequest, claims: dict = Depends(decode_jwt), firestore_client: firestore.Client = Depends(get_db)):
    check_access(claims["sub"], payload.patient_id, firestore_client)
    missed_query = (
        firestore_client.collection("dose_events")
        .where("patient_id", "==", payload.patient_id)
        .where("status", "==", "missed")
        .stream()
    )
    missed_count = len(list(missed_query))
    risk = detect_risk(missed_count, payload.symptoms, payload.severity)
    rid = f"risk-{uuid4()}"
    firestore_client.collection("risk_events").document(rid).set(
        {
            "id": rid,
            "patient_id": payload.patient_id,
            "symptoms": payload.symptoms,
            "severity": payload.severity,
            "missed_doses": missed_count,
            "risk": risk,
            "created_at": now_iso(),
        }
    )
    create_timeline_event(payload.patient_id, "risk", f"Risk level: {risk}")
    return {"patient_id": payload.patient_id, "risk": risk, "missed_doses": missed_count}


@app.post("/alerts/intelligent")
def intelligent_alerts(payload: RiskRequest, claims: dict = Depends(decode_jwt), firestore_client: firestore.Client = Depends(get_db)):
    check_access(claims["sub"], payload.patient_id, firestore_client)
    dose_docs = firestore_client.collection("dose_events").where("patient_id", "==", payload.patient_id).stream()
    doses = [d.to_dict() for d in dose_docs]
    missed = len([d for d in doses if d.get("status") == "missed"])
    delayed = len([d for d in doses if d.get("status") == "delayed"])
    risk = detect_risk(missed, payload.symptoms, payload.severity)
    alerts: List[str] = []
    if missed >= 2:
        alerts.append("Missed multiple doses")
    if delayed >= 2:
        alerts.append("Multiple delayed doses")
    if risk == "high":
        alerts.append("High risk pattern detected")
    links = firestore_client.collection("caregiver_links").where("patient_id", "==", payload.patient_id).stream()
    for link in links:
        caregiver_id = link.to_dict()["caregiver_id"]
        for alert in alerts:
            send_push_to_user(caregiver_id, "Patient Alert", alert)
    return {"patient_id": payload.patient_id, "risk": risk, "alerts": alerts}


@app.post("/emergency/trigger")
def emergency_trigger(payload: EmergencyRequest, claims: dict = Depends(decode_jwt), firestore_client: firestore.Client = Depends(get_db)):
    check_access(claims["sub"], payload.patient_id, firestore_client)
    event_id = f"emg-{uuid4()}"
    firestore_client.collection("emergency_events").document(event_id).set(
        {
            "id": event_id,
            "patient_id": payload.patient_id,
            "reason": payload.reason,
            "created_at": now_iso(),
        }
    )
    create_timeline_event(payload.patient_id, "emergency", payload.reason)
    links = firestore_client.collection("caregiver_links").where("patient_id", "==", payload.patient_id).stream()
    caregiver_ids = []
    for link in links:
        caregiver_id = link.to_dict()["caregiver_id"]
        caregiver_ids.append(caregiver_id)
        send_push_to_user(caregiver_id, "Emergency Alert", payload.reason)
    return {"patient_id": payload.patient_id, "emergency": True, "notified_caregiver_ids": caregiver_ids}


@app.get("/sync/timeline/{patient_id}")
def timeline(patient_id: str, claims: dict = Depends(decode_jwt), firestore_client: firestore.Client = Depends(get_db)):
    check_access(claims["sub"], patient_id, firestore_client)
    docs = (
        firestore_client.collection("timeline_events")
        .where("patient_id", "==", patient_id)
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(100)
        .stream()
    )
    return {"patient_id": patient_id, "events": [d.to_dict() for d in docs]}


@app.post("/assistant/chat")
def assistant_chat(payload: AssistantRequest):
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            system_prompt = "You are DischargeBuddy, a post-hospital recovery medical assistant. Answer concisely, simply, and safely. Under strictly medical emergencies, trigger a notice to call an ambulance."
            response = model.generate_content(f"{system_prompt}\nUser query: {payload.message}")
            return {"answer": response.text.strip()}
        except Exception as e:
            return {"answer": "I'm having a network issue reaching my AI brain. Try again in a moment."}
            
    # Offline dummy fallback if no API key present
    text = payload.message.lower()
    answer = "I am currently running in offline basic mode (GEMINI_API_KEY missing). I can help with basic medicine timings."
    if "missed" in text:
        answer = "Offline rule: Take missed dose when remembered unless next scheduled dose is near. Never double dose."
    elif "emergency" in text or "chest pain" in text:
        answer = "Offline rule: For chest pain or breathing distress, trigger emergency and contact local services now."
    return {"answer": answer}


@app.get("/medicines")
def medicines(firestore_client: firestore.Client = Depends(get_db)):
    docs = firestore_client.collection("medicine_catalog").stream()
    return {"medicines": [d.to_dict() for d in docs]}


@app.get("/location/nearby")
async def location_nearby(query: str = "pharmacy near me"):
    params = {"q": query, "format": "json", "limit": "8"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params=params,
            headers={"User-Agent": "discharge-buddy-backend/1.0"},
        )
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Location provider unavailable")
    rows = response.json()
    return {
        "query": query,
        "places": [{"name": r.get("display_name"), "lat": float(r.get("lat")), "lon": float(r.get("lon"))} for r in rows],
    }
