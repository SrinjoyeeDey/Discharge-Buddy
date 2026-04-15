from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)

# In-memory storage (temporary)
dose_logs = []
followups = []
recovery_logs = []

@app.route("/")
def home():
    return "Backend is running"

# ------------------ DOSE TRACKING ------------------

@app.route("/add-dose", methods=["POST"])
def add_dose():
    data = request.json

    if not data:
        return jsonify({"error": "No data received"}), 400
    
    log = {
        "medicine": data.get("medicine"),
        "time": data.get("time"),
        "taken": data.get("taken"),
        "timestamp": str(datetime.now())
    }
    
    dose_logs.append(log)
    
    return jsonify({"message": "Dose recorded", "data": log})

@app.route("/get-doses", methods=["GET"])
def get_doses():
    return jsonify(dose_logs)

# ------------------ FOLLOW-UP ------------------

@app.route("/add-followup", methods=["POST"])
def add_followup():
    data = request.json

    if not data:
        return jsonify({"error": "No data received"}), 400
    
    followups.append(data)
    
    return jsonify({"message": "Follow-up added", "data": data})

@app.route("/get-followups", methods=["GET"])
def get_followups():
    return jsonify(followups)

# ------------------ LANGUAGE SIMPLIFIER ------------------

mapping = {
    "BD": "Twice a day",
    "OD": "Once a day",
    "TDS": "Three times a day",
    "HS": "At bedtime"
}

@app.route("/simplify", methods=["POST"])
def simplify():
    data = request.json

    if not data:
        return jsonify({"error": "No data received"}), 400
    
    text = data.get("text")
    
    simple_text = mapping.get(text, "Not found")
    
    return jsonify({
        "original": text,
        "simple": simple_text
    })

# ------------------ RECOVERY LOGS ------------------

@app.route("/add-recovery", methods=["POST"])
def add_recovery():
    data = request.json

    if not data:
        return jsonify({"error": "No data received"}), 400
    
    recovery_logs.append(data)
    
    return jsonify({
        "message": "Recovery data added",
        "data": data
    })

@app.route("/get-recovery", methods=["GET"])
def get_recovery():
    return jsonify(recovery_logs)

# ------------------ RUN SERVER ------------------

if __name__ == "__main__":
    app.run(debug=True)