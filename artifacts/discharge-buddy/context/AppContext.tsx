import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type UserRole = "patient" | "caregiver" | null;

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  instructions: string;
  simplifiedInstructions: string;
  startDate: string;
  endDate?: string;
  color: string;
}

export interface DoseLog {
  id: string;
  medicineId: string;
  medicineName: string;
  scheduledTime: string;
  takenAt?: string;
  status: "taken" | "missed" | "pending" | "snoozed";
  date: string;
}

export interface SymptomLog {
  id: string;
  date: string;
  symptoms: string[];
  severity: number;
  notes: string;
  riskLevel: "low" | "medium" | "high";
}

export interface FollowUp {
  id: string;
  title: string;
  doctorName: string;
  dateTime: string;
  location: string;
  notes: string;
  completed: boolean;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  condition: string;
  dischargeDate: string;
  medicines: Medicine[];
  doseLogs: DoseLog[];
  symptomLogs: SymptomLog[];
  followUps: FollowUp[];
  emergencyContact: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  linkedPatientId?: string;
}

interface AppContextType {
  user: AppUser | null;
  role: UserRole;
  patient: Patient | null;
  medicines: Medicine[];
  todayDoses: DoseLog[];
  symptomLogs: SymptomLog[];
  followUps: FollowUp[];
  isOnboarded: boolean;
  setRole: (role: UserRole) => void;
  setUser: (user: AppUser) => void;
  addMedicine: (medicine: Medicine) => void;
  updateDoseStatus: (doseId: string, status: DoseLog["status"]) => void;
  addSymptomLog: (log: SymptomLog) => void;
  addFollowUp: (followUp: FollowUp) => void;
  completeFollowUp: (id: string) => void;
  setOnboarded: (val: boolean) => void;
  triggerEmergency: () => void;
  language: "en" | "hi" | "es" | "ur";
  setLanguage: (lang: "en" | "hi" | "es" | "ur") => void;
  linkedPatients: Patient[];
  addPrescription: (imageUri: string) => Promise<void>;
  isProcessingPrescription: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = "discharge_buddy_data";

const DEMO_MEDICINES: Medicine[] = [
  {
    id: "m1",
    name: "Metformin",
    dosage: "500mg",
    frequency: "Twice daily",
    times: ["08:00", "20:00"],
    instructions: "Take with meals to reduce GI side effects. Monitor blood glucose regularly.",
    simplifiedInstructions: "Take this pill with breakfast and dinner. It helps control your blood sugar.",
    startDate: new Date().toISOString(),
    color: "#0891b2",
  },
  {
    id: "m2",
    name: "Lisinopril",
    dosage: "10mg",
    frequency: "Once daily",
    times: ["08:00"],
    instructions: "Take in the morning. Monitor blood pressure. Avoid NSAIDs.",
    simplifiedInstructions: "Take this pill every morning. It lowers your blood pressure. Avoid ibuprofen.",
    startDate: new Date().toISOString(),
    color: "#10b981",
  },
  {
    id: "m3",
    name: "Aspirin",
    dosage: "81mg",
    frequency: "Once daily",
    times: ["20:00"],
    instructions: "Low-dose aspirin for cardiovascular protection. Take at night.",
    simplifiedInstructions: "Take this small pill at bedtime. It protects your heart.",
    startDate: new Date().toISOString(),
    color: "#f59e0b",
  },
  {
    id: "m4",
    name: "Atorvastatin",
    dosage: "20mg",
    frequency: "Once daily",
    times: ["21:00"],
    instructions: "Take at bedtime for best efficacy. Avoid grapefruit juice.",
    simplifiedInstructions: "Take this pill before sleep. It reduces cholesterol. Avoid grapefruit.",
    startDate: new Date().toISOString(),
    color: "#8b5cf6",
  },
];

function generateTodayDoses(medicines: Medicine[]): DoseLog[] {
  const today = new Date().toISOString().split("T")[0];
  const doses: DoseLog[] = [];
  for (const med of medicines) {
    for (const time of med.times) {
      const [hour, min] = time.split(":").map(Number);
      const scheduled = new Date();
      scheduled.setHours(hour, min, 0, 0);
      const now = new Date();
      const status: DoseLog["status"] = scheduled < now && scheduled.getHours() < now.getHours() - 1 ? "missed" : "pending";
      doses.push({
        id: `${med.id}_${time}_${today}`,
        medicineId: med.id,
        medicineName: med.name,
        scheduledTime: time,
        status: status === "missed" && Math.random() > 0.5 ? "taken" : status,
        date: today,
      });
    }
  }
  return doses;
}

const DEMO_FOLLOW_UPS: FollowUp[] = [
  {
    id: "f1",
    title: "Cardiology Follow-up",
    doctorName: "Dr. Sarah Mitchell",
    dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    location: "City Heart Hospital, Room 204",
    notes: "Bring latest BP readings and medication list",
    completed: false,
  },
  {
    id: "f2",
    title: "Blood Test",
    doctorName: "Lab at General Hospital",
    dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Pathology Lab, Ground Floor",
    notes: "Fasting required - no food 8 hours before",
    completed: false,
  },
];

const DEMO_PATIENT: Patient = {
  id: "p1",
  name: "John Doe",
  age: 58,
  condition: "Post-cardiac surgery recovery",
  dischargeDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  medicines: DEMO_MEDICINES,
  doseLogs: [],
  symptomLogs: [],
  followUps: DEMO_FOLLOW_UPS,
  emergencyContact: "+1 (555) 911-0000",
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(null);
  const [role, setRoleState] = useState<UserRole>(null);
  const [medicines, setMedicines] = useState<Medicine[]>(DEMO_MEDICINES);
  const [todayDoses, setTodayDoses] = useState<DoseLog[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>(DEMO_FOLLOW_UPS);
  const [isOnboarded, setIsOnboardedState] = useState(false);
  const [language, setLanguageState] = useState<"en" | "hi" | "es" | "ur">("en");
  const [isProcessingPrescription, setIsProcessingPrescription] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (medicines.length > 0) {
      const doses = generateTodayDoses(medicines);
      setTodayDoses(doses);
    }
  }, [medicines]);

  async function loadData() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.role) setRoleState(data.role);
        if (data.user) setUserState(data.user);
        if (data.isOnboarded) setIsOnboardedState(data.isOnboarded);
        if (data.language) setLanguageState(data.language);
        if (data.medicines) setMedicines(data.medicines);
        if (data.symptomLogs) setSymptomLogs(data.symptomLogs);
        if (data.followUps) setFollowUps(data.followUps);
      }
    } catch {}
  }

  async function saveData(updates: Record<string, unknown>) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : {};
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...updates }));
    } catch {}
  }

  const setRole = (r: UserRole) => {
    setRoleState(r);
    saveData({ role: r });
  };

  const setUser = (u: AppUser) => {
    setUserState(u);
    saveData({ user: u });
  };

  const setOnboarded = (val: boolean) => {
    setIsOnboardedState(val);
    saveData({ isOnboarded: val });
  };

  const setLanguage = (lang: "en" | "hi" | "es" | "ur") => {
    setLanguageState(lang);
    saveData({ language: lang });
  };

  const addMedicine = (medicine: Medicine) => {
    const updated = [...medicines, medicine];
    setMedicines(updated);
    saveData({ medicines: updated });
  };

  const updateDoseStatus = (doseId: string, status: DoseLog["status"]) => {
    setTodayDoses((prev) =>
      prev.map((d) =>
        d.id === doseId ? { ...d, status, takenAt: status === "taken" ? new Date().toISOString() : undefined } : d
      )
    );
  };

  const addSymptomLog = (log: SymptomLog) => {
    const updated = [log, ...symptomLogs];
    setSymptomLogs(updated);
    saveData({ symptomLogs: updated });
  };

  const addFollowUp = (followUp: FollowUp) => {
    const updated = [followUp, ...followUps];
    setFollowUps(updated);
    saveData({ followUps: updated });
  };

  const completeFollowUp = (id: string) => {
    const updated = followUps.map((f) => (f.id === id ? { ...f, completed: true } : f));
    setFollowUps(updated);
    saveData({ followUps: updated });
  };

  const triggerEmergency = () => {
    console.log("EMERGENCY TRIGGERED - Notifying caregivers");
  };

  const addPrescription = async (_imageUri: string) => {
    setIsProcessingPrescription(true);
    await new Promise((r) => setTimeout(r, 2500));
    setIsProcessingPrescription(false);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        role,
        patient: DEMO_PATIENT,
        medicines,
        todayDoses,
        symptomLogs,
        followUps,
        isOnboarded,
        setRole,
        setUser,
        addMedicine,
        updateDoseStatus,
        addSymptomLog,
        addFollowUp,
        completeFollowUp,
        setOnboarded,
        triggerEmergency,
        language,
        setLanguage,
        linkedPatients: [DEMO_PATIENT],
        addPrescription,
        isProcessingPrescription,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
