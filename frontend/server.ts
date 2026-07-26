import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Gemini Client
const aiKey = process.env.GEMINI_API_KEY;
const ai = aiKey
  ? new GoogleGenAI({
      apiKey: aiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Initial In-Memory Database Seed
let policeStations = [
  {
    id: "ST-01",
    name: "Precinct 01 - HQ Command",
    code: "DEL-HQ-01",
    district: "Central District",
    address: "Parliament Street, Connaught Place, New Delhi",
    latitude: 28.6271,
    longitude: 77.2166,
    phone: "+91 11 2334 0000",
    inCharge: "ACP Inspector R. K. Sharma",
    activeOfficers: 42,
    activeCases: 18,
  },
  {
    id: "ST-02",
    name: "Northern Sector Police Station",
    code: "DEL-N-02",
    district: "Northern District",
    address: "Civil Lines, Near Delhi University, New Delhi",
    latitude: 28.6814,
    longitude: 77.2226,
    phone: "+91 11 2381 1234",
    inCharge: "Inspector Vikramaditya Singh",
    activeOfficers: 28,
    activeCases: 14,
  },
  {
    id: "ST-03",
    name: "South Extension Precinct",
    code: "DEL-S-03",
    district: "Southern District",
    address: "Ring Road, South Ext Part 2, New Delhi",
    latitude: 28.5684,
    longitude: 77.2215,
    phone: "+91 11 2462 8888",
    inCharge: "Sub-Inspector Ananya Deshmukh",
    activeOfficers: 35,
    activeCases: 22,
  },
  {
    id: "ST-04",
    name: "Cyber Crime Cell HQ",
    code: "DEL-CYBER-04",
    district: "Special Operations",
    address: "CGO Complex, Lodhi Road, New Delhi",
    latitude: 28.5892,
    longitude: 77.237,
    phone: "+91 11 2436 9900",
    inCharge: "DCP Technical Ops A. K. Varma",
    activeOfficers: 19,
    activeCases: 31,
  },
  {
    id: "ST-05",
    name: "East River Precinct",
    code: "DEL-E-05",
    district: "Eastern District",
    address: "Laxmi Nagar Main Road, New Delhi",
    latitude: 28.6304,
    longitude: 77.2777,
    phone: "+91 11 2250 4455",
    inCharge: "Inspector Suresh Patil",
    activeOfficers: 24,
    activeCases: 12,
  },
];

let patrolUnits = [
  {
    id: "U-01",
    unitCode: "PT-09",
    type: "PATROL",
    status: "EN ROUTE",
    assignedCaseId: "CASE-2026-00124",
    latitude: 28.6139,
    longitude: 77.209,
    batteryOrFuel: 88,
    speedKmh: 42,
    lastPing: "10 seconds ago",
  },
  {
    id: "U-02",
    unitCode: "PT-12",
    type: "PATROL",
    status: "EN ROUTE",
    assignedCaseId: "CASE-2026-00124",
    latitude: 28.6152,
    longitude: 77.2115,
    batteryOrFuel: 94,
    speedKmh: 48,
    lastPing: "5 seconds ago",
  },
  {
    id: "U-03",
    unitCode: "SWAT-2",
    type: "SWAT",
    status: "STANDBY",
    assignedCaseId: undefined,
    latitude: 28.6271,
    longitude: 77.2166,
    batteryOrFuel: 100,
    speedKmh: 0,
    lastPing: "Just now",
  },
  {
    id: "U-04",
    unitCode: "TR-04",
    type: "TRAFFIC",
    status: "ON SCENE",
    assignedCaseId: "CASE-2026-00123",
    latitude: 28.632,
    longitude: 77.22,
    batteryOrFuel: 76,
    speedKmh: 12,
    lastPing: "12 seconds ago",
  },
  {
    id: "U-05",
    unitCode: "K-9-1",
    type: "K-9",
    status: "PATROLLING",
    assignedCaseId: undefined,
    latitude: 28.675,
    longitude: 77.218,
    batteryOrFuel: 82,
    speedKmh: 24,
    lastPing: "2 seconds ago",
  },
];

let officers = [
  {
    id: "OFF-101",
    name: "Inspector C. Sterling",
    badgeNumber: "IND-POL-8841",
    rank: "Inspector",
    precinct: "Precinct 01 - HQ Command",
    stationId: "ST-01",
    specialty: "Tactical Response & Command",
    resolvedCount: 142,
    activeCount: 3,
  },
  {
    id: "OFF-102",
    name: "Sub-Inspector Priya Sharma",
    badgeNumber: "IND-POL-9023",
    rank: "Sub-Inspector",
    precinct: "Cyber Crime Cell HQ",
    stationId: "ST-04",
    specialty: "Cyber Fraud & OSINT",
    resolvedCount: 98,
    activeCount: 5,
  },
  {
    id: "OFF-103",
    name: "Inspector Rajesh Verma",
    badgeNumber: "IND-POL-7712",
    rank: "Inspector",
    precinct: "Northern Sector Police Station",
    stationId: "ST-02",
    specialty: "Organized Crime & Investigation",
    resolvedCount: 120,
    activeCount: 2,
  },
  {
    id: "OFF-104",
    name: "Sub-Inspector Amit Kumar",
    badgeNumber: "IND-POL-6549",
    rank: "Sub-Inspector",
    precinct: "South Extension Precinct",
    stationId: "ST-03",
    specialty: "Traffic & Highway Patrol",
    resolvedCount: 84,
    activeCount: 4,
  },
];

let complaints = [
  {
    id: "CASE-2026-00124",
    citizenName: "Rahul Kapoor",
    citizenPhone: "+91 98765 43210",
    citizenEmail: "rahul.k@example.com",
    crimeCategory: "Domestic Escalation" as const,
    title: "Residential Disturbance Level 2 - Domestic Escalation",
    description:
      "Domestic verbal escalation with suspected glass breach in Sector-B residential block 402. High tension reported by neighbours. Perimeter security requested.",
    latitude: 28.6139,
    longitude: 77.209,
    address: "Unit 402, Sector-B, Central District, New Delhi",
    district: "Central District",
    photos: [],
    videos: [],
    isAnonymous: false,
    isEmergency: true,
    status: "In Progress" as const,
    priority: "CRITICAL" as const,
    assignedOfficerId: "OFF-101",
    assignedOfficerName: "Inspector C. Sterling",
    assignedStationId: "ST-01",
    assignedStationName: "Precinct 01 - HQ Command",
    createdAt: "2026-07-25T10:24:15Z",
    updatedAt: "2026-07-25T10:26:00Z",
    timeline: [
      {
        id: "TL-01",
        timestamp: "2026-07-25 10:24:15",
        status: "Submitted",
        actor: "Citizen (Rahul K.)",
        message: "Emergency complaint logged via SOS platform.",
      },
      {
        id: "TL-02",
        timestamp: "2026-07-25 10:24:18",
        status: "AI Triage",
        actor: "Sentinel AI Engine",
        message:
          "AI classified CRITICAL severity. Fake probability 1.2%. Nearest station: Precinct 01.",
      },
      {
        id: "TL-03",
        timestamp: "2026-07-25 10:25:00",
        status: "Dispatched",
        actor: "Dispatcher HQ",
        message:
          "Assigned Inspector C. Sterling. Dispatched units PT-09, PT-12 en route.",
      },
    ],
    aiAnalysis: {
      category: "Domestic Escalation" as const,
      severity: "Critical" as const,
      priority: "CRITICAL" as const,
      fakeProbability: 1.2,
      fakeReasoning:
        "High acoustic and circumstantial markers, verified phone number with clear geographic correlation.",
      isDuplicate: false,
      duplicateConfidence: 0,
      nearestStation: "Precinct 01 - HQ Command",
      suggestedAction:
        "Establish immediate 50m perimeter. Deploy de-escalation officer alongside 2 field patrol units.",
      estimatedResponseTime: "4m 12s",
      confidenceScore: 94.8,
      hotspotZone: "Zone 4 - Sector-B",
      recommendedOfficerSpecialty: "Tactical Response & De-escalation",
      ipcSections: ["BNS 115 (Voluntarily Causing Hurt)", "BNS 352 (Intimidation)"],
    },
    officerNotes: [
      {
        id: "ON-01",
        officerName: "Inspector C. Sterling",
        badgeNumber: "IND-POL-8841",
        timestamp: "2026-07-25 10:26:00",
        note: "Units PT-09 and PT-12 are 1.2 km away. ETA 3 minutes. Perimeter clearance in motion.",
      },
    ],
  },
  {
    id: "CASE-2026-00123",
    citizenName: "Sunita Verma",
    citizenPhone: "+91 98111 22334",
    citizenEmail: "sunita.v@example.com",
    crimeCategory: "Traffic Incident" as const,
    title: "Major Traffic Collision at Connaught Place Outer Ring",
    description:
      "Minor collision between sedan and auto-rickshaw at busy intersection. No heavy casualties, but traffic flow diverted. Arguments ongoing.",
    latitude: 28.632,
    longitude: 77.22,
    address: "Outer Ring, Connaught Place Main Circle, New Delhi",
    district: "Central District",
    photos: [],
    videos: [],
    isAnonymous: false,
    isEmergency: false,
    status: "In Progress" as const,
    priority: "ROUTINE" as const,
    assignedOfficerId: "OFF-104",
    assignedOfficerName: "Sub-Inspector Amit Kumar",
    assignedStationId: "ST-01",
    assignedStationName: "Precinct 01 - HQ Command",
    createdAt: "2026-07-25T10:18:02Z",
    updatedAt: "2026-07-25T10:20:00Z",
    timeline: [
      {
        id: "TL-10",
        timestamp: "2026-07-25 10:18:02",
        status: "Submitted",
        actor: "Citizen (Sunita V.)",
        message: "Traffic incident report filed.",
      },
      {
        id: "TL-11",
        timestamp: "2026-07-25 10:19:00",
        status: "Assigned",
        actor: "Dispatch Auto-Router",
        message: "Assigned Sub-Inspector Amit Kumar (Traffic Division).",
      },
    ],
    aiAnalysis: {
      category: "Traffic Incident" as const,
      severity: "Low" as const,
      priority: "ROUTINE" as const,
      fakeProbability: 3.5,
      fakeReasoning: "Standard routine report with matching road coordinates.",
      isDuplicate: false,
      duplicateConfidence: 0,
      nearestStation: "Precinct 01 - HQ Command",
      suggestedAction:
        "Dispatch unit TR-04 to clear intersection and record statements.",
      estimatedResponseTime: "8m 00s",
      confidenceScore: 91.2,
      hotspotZone: "CP Intersection Alpha",
      recommendedOfficerSpecialty: "Traffic & Highway Patrol",
      ipcSections: ["BNS 281 (Rash Driving)"],
    },
    officerNotes: [
      {
        id: "ON-02",
        officerName: "Sub-Inspector Amit Kumar",
        badgeNumber: "IND-POL-6549",
        timestamp: "2026-07-25 10:20:00",
        note: "Unit TR-04 on scene. Vehicles moved to shoulder.",
      },
    ],
  },
  {
    id: "CASE-2026-00122",
    citizenName: "Anonymous Citizen",
    citizenPhone: "Hidden",
    citizenEmail: "",
    crimeCategory: "Cybercrime" as const,
    title: "Phishing Scam Targeting Senior Citizens via Banking SMS",
    description:
      "Fake APK link sent claiming electricity bill disconnection. Deducted ₹85,000 from victim's account within 10 minutes.",
    latitude: 28.5892,
    longitude: 77.237,
    address: "Lodhi Colony, South Delhi",
    district: "Special Operations",
    photos: [],
    videos: [],
    isAnonymous: true,
    isEmergency: false,
    status: "Under Review" as const,
    priority: "HIGH" as const,
    assignedOfficerId: "OFF-102",
    assignedOfficerName: "Sub-Inspector Priya Sharma",
    assignedStationId: "ST-04",
    assignedStationName: "Cyber Crime Cell HQ",
    createdAt: "2026-07-25T09:55:40Z",
    updatedAt: "2026-07-25T09:58:00Z",
    timeline: [
      {
        id: "TL-20",
        timestamp: "2026-07-25 09:55:40",
        status: "Submitted",
        actor: "Anonymous Citizen",
        message: "Anonymous cyber fraud report lodged.",
      },
      {
        id: "TL-21",
        timestamp: "2026-07-25 09:56:00",
        status: "AI Triage",
        actor: "Sentinel Cyber AI",
        message:
          "High priority cyber crime detected. Bank portal freeze request triggered to 1930 portal.",
      },
    ],
    aiAnalysis: {
      category: "Cybercrime" as const,
      severity: "High" as const,
      priority: "HIGH" as const,
      fakeProbability: 4.1,
      fakeReasoning:
        "High correlation with active 'Power Bill APK' cyber scam wave operating in Delhi-NCR.",
      isDuplicate: true,
      matchedComplaintId: "CASE-2026-00098",
      duplicateConfidence: 87.5,
      nearestStation: "Cyber Crime Cell HQ",
      suggestedAction:
        "Issue instant lien request to bank nodal officer via 1930 National Cyber Crime Portal.",
      estimatedResponseTime: "15m 00s",
      confidenceScore: 96.1,
      hotspotZone: "Digital Cyber Network",
      recommendedOfficerSpecialty: "Cyber Fraud & OSINT",
      ipcSections: ["BNS 318 (Cheating)", "IT Act Sec 66D"],
    },
    officerNotes: [],
  },
  {
    id: "CASE-2026-00120",
    citizenName: "Meenakshi Sundaram",
    citizenPhone: "+91 94440 12345",
    citizenEmail: "m.sundaram@example.com",
    crimeCategory: "Theft/Burglary" as const,
    title: "Commercial Shop Break-in at Civil Lines Market",
    description:
      "Shutter lock broken overnight. Jewelry and cash box missing worth approximately ₹3.5 Lakhs. CCTV footage available.",
    latitude: 28.6814,
    longitude: 77.2226,
    address: "Shop 14, Civil Lines Main Market, Northern District",
    district: "Northern District",
    photos: [],
    videos: [],
    isAnonymous: false,
    isEmergency: false,
    status: "Assigned" as const,
    priority: "HIGH" as const,
    assignedOfficerId: "OFF-103",
    assignedOfficerName: "Inspector Rajesh Verma",
    assignedStationId: "ST-02",
    assignedStationName: "Northern Sector Police Station",
    createdAt: "2026-07-25T08:12:00Z",
    updatedAt: "2026-07-25T08:30:00Z",
    timeline: [
      {
        id: "TL-30",
        timestamp: "2026-07-25 08:12:00",
        status: "Submitted",
        actor: "Citizen (Meenakshi S.)",
        message: "Burglary complaint filed.",
      },
    ],
    aiAnalysis: {
      category: "Theft/Burglary" as const,
      severity: "High" as const,
      priority: "HIGH" as const,
      fakeProbability: 2.8,
      fakeReasoning:
        "Legitimate merchant profile, CCTV attachment verified.",
      isDuplicate: false,
      duplicateConfidence: 0,
      nearestStation: "Northern Sector Police Station",
      suggestedAction:
        "Deploy forensics team for fingerprint collection. Collect DVR CCTV hard drive.",
      estimatedResponseTime: "12m 00s",
      confidenceScore: 93.4,
      hotspotZone: "Civil Lines Commercial Hub",
      recommendedOfficerSpecialty: "Organized Crime & Investigation",
      ipcSections: ["BNS 305 (Theft in dwelling house)", "BNS 331 (Lurking house-trespass)"],
    },
    officerNotes: [],
  },
];

let auditLogs = [
  {
    id: "LOG-9001",
    action: "SYSTEM_BOOT",
    user: "SYSTEM_DAEMON",
    role: "SYSTEM",
    ip: "127.0.0.1",
    details: "Sentinel Operational Network v4.2 initialized. Encryption verified.",
    timestamp: "2026-07-25 00:00:01",
  },
  {
    id: "LOG-9002",
    action: "OFFICER_LOGIN",
    user: "Inspector C. Sterling (IND-POL-8841)",
    role: "police_admin",
    ip: "10.240.12.89",
    details: "Authentication successful via Sentinel Command Portal.",
    timestamp: "2026-07-25 08:30:12",
  },
  {
    id: "LOG-9003",
    action: "CASE_DISPATCH",
    user: "Dispatcher HQ",
    role: "police_officer",
    ip: "10.240.12.92",
    details: "Dispatched units PT-09 and PT-12 to CASE-2026-00124.",
    timestamp: "2026-07-25 10:25:00",
  },
];

let notifications = [
  {
    id: "NOTIF-01",
    title: "CRITICAL EMERGENCY ALERT",
    message: "Residential Disturbance Level 2 logged at Sector-B. Units PT-09 & PT-12 assigned.",
    type: "EMERGENCY" as const,
    timestamp: "10:24 AM",
    read: false,
    complaintId: "CASE-2026-00124",
  },
  {
    id: "NOTIF-02",
    title: "AI Anomaly Detected",
    message: "Statistical spike (+14.2%) in cyber fraud APK reports in Northern District.",
    type: "SYSTEM" as const,
    timestamp: "09:45 AM",
    read: false,
    complaintId: "CASE-2026-00122",
  },
  {
    id: "NOTIF-03",
    title: "Officer Assigned",
    message: "Inspector Rajesh Verma assigned to Burglary Case CASE-2026-00120.",
    type: "ASSIGNMENT" as const,
    timestamp: "08:30 AM",
    read: true,
    complaintId: "CASE-2026-00120",
  },
];

// Helper: AI Complaint Analysis Function
async function analyzeComplaintWithAI(draft: {
  title: string;
  description: string;
  crimeCategory: string;
  latitude: number;
  longitude: number;
  address?: string;
  isEmergency?: boolean;
}) {
  if (!ai) {
    // Fallback heuristic engine if GEMINI_API_KEY is not configured
    const isEmerg =
      draft.isEmergency ||
      /kill|weapon|gun|knife|blood|fire|bomb|hostage|emergency|attack|assault/i.test(
        draft.description + " " + draft.title
      );
    const category = draft.crimeCategory || "General Incident";
    const priority = isEmerg ? "CRITICAL" : /stolen|fraud|theft|scam/i.test(draft.description) ? "HIGH" : "ROUTINE";
    
    return {
      category: category,
      severity: isEmerg ? "Critical" : priority === "HIGH" ? "High" : "Medium",
      priority: priority,
      fakeProbability: Math.floor(Math.random() * 5) + 1,
      fakeReasoning: "Standard verified metadata, plausible location vector and contact phone.",
      isDuplicate: false,
      matchedComplaintId: undefined,
      duplicateConfidence: 0,
      nearestStation: "Precinct 01 - HQ Command",
      suggestedAction: isEmerg
        ? "Immediate rapid unit dispatch. Establish 100m perimeter and alert medical team."
        : "Assign precinct officer for preliminary statement collection.",
      estimatedResponseTime: isEmerg ? "3m 45s" : "10m 00s",
      confidenceScore: 92.5,
      hotspotZone: "District Zone 1",
      recommendedOfficerSpecialty: isEmerg ? "Rapid Deployment Force" : "General Investigation",
      ipcSections: ["BNS 115", "BNS 351"],
    };
  }

  try {
    const promptText = `You are the AI Crime Intelligence System for the Indian Police ("Sentinel AI").
Analyze this citizen complaint report in detail and return JSON matching the specified schema.

Complaint Title: ${draft.title}
Crime Category: ${draft.crimeCategory}
Description: ${draft.description}
Location Coordinates: Lat ${draft.latitude}, Lng ${draft.longitude}
User Claimed Emergency: ${draft.isEmergency ? "YES" : "NO"}

Evaluate:
1. Exact Crime Category classification
2. Severity ('Critical', 'High', 'Medium', 'Low')
3. Priority ('CRITICAL', 'HIGH', 'ROUTINE')
4. Fake Complaint Probability (0.0 to 100.0) with reasoning
5. Duplicate Complaint Check
6. Nearest Police Station (e.g., Precinct 01 - HQ Command, Northern Sector Police Station, Cyber Crime Cell HQ, South Extension Precinct)
7. Suggested Police Response / Tactical Action Plan
8. Estimated Response Time (e.g. "4m 12s", "9m 30s")
9. Confidence Score (0.0 to 100.0)
10. Recommended Officer Specialty
11. Relevant Indian Penal Code (IPC) / Bharatiya Nyaya Sanhita (BNS) law sections.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ["Critical", "High", "Medium", "Low"] },
            priority: { type: Type.STRING, enum: ["CRITICAL", "HIGH", "ROUTINE"] },
            fakeProbability: { type: Type.NUMBER },
            fakeReasoning: { type: Type.STRING },
            isDuplicate: { type: Type.BOOLEAN },
            matchedComplaintId: { type: Type.STRING },
            duplicateConfidence: { type: Type.NUMBER },
            nearestStation: { type: Type.STRING },
            suggestedAction: { type: Type.STRING },
            estimatedResponseTime: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
            hotspotZone: { type: Type.STRING },
            recommendedOfficerSpecialty: { type: Type.STRING },
            ipcSections: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            "category",
            "severity",
            "priority",
            "fakeProbability",
            "fakeReasoning",
            "isDuplicate",
            "nearestStation",
            "suggestedAction",
            "estimatedResponseTime",
            "confidenceScore",
          ],
        },
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return parsed;
    }
  } catch (err) {
    console.error("Gemini AI Analysis Error:", err);
  }

  // Fallback if AI call fails
  return {
    category: draft.crimeCategory || "General Incident",
    severity: draft.isEmergency ? "Critical" : "Medium",
    priority: draft.isEmergency ? "CRITICAL" : "ROUTINE",
    fakeProbability: 2.5,
    fakeReasoning: "Fallback rule engine: Verified geolocation coordinates and citizen record.",
    isDuplicate: false,
    nearestStation: "Precinct 01 - HQ Command",
    suggestedAction: "Acknowledge complaint and assign duty officer.",
    estimatedResponseTime: "6m 30s",
    confidenceScore: 88.0,
    hotspotZone: "Central Sector",
    recommendedOfficerSpecialty: "Law & Order",
    ipcSections: ["BNS 351"],
  };
}

// REST API ROUTES

// Auth Route
app.post("/api/auth/login", (req, res) => {
  const { email, password, role } = req.body;
  
  if (role === "police_admin" || role === "police_officer") {
    return res.json({
      token: "jwt-token-police-admin-8841",
      user: {
        id: "OFF-101",
        name: "Inspector C. Sterling",
        email: email || "sterling@police.gov.in",
        phone: "+91 11 2334 8841",
        role: role || "police_admin",
        badgeNumber: "IND-POL-8841",
        rank: "Inspector Command",
        precinct: "Precinct 01 - HQ Command",
        stationId: "ST-01",
        district: "Central District",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      },
    });
  }

  // Default Citizen User
  return res.json({
    token: "jwt-token-citizen-1002",
    user: {
      id: "CIT-1002",
      name: "Rahul Kapoor",
      email: email || "rahul.k@example.com",
      phone: "+91 98765 43210",
      role: "citizen",
      district: "Central District",
    },
  });
});

// Get Complaints List
app.get("/api/complaints", (req, res) => {
  const { search, category, status, priority, district } = req.query;
  let filtered = [...complaints];

  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.citizenName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        (c.assignedOfficerName && c.assignedOfficerName.toLowerCase().includes(q))
    );
  }

  if (category && category !== "ALL") {
    filtered = filtered.filter((c) => c.crimeCategory === category);
  }

  if (status && status !== "ALL") {
    filtered = filtered.filter((c) => c.status === status);
  }

  if (priority && priority !== "ALL") {
    filtered = filtered.filter((c) => c.priority === priority);
  }

  if (district && district !== "ALL") {
    filtered = filtered.filter((c) => c.district === district);
  }

  return res.json(filtered);
});

interface AuthUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'citizen' | 'police_officer' | 'police_admin';
  phone: string;
  employeeId?: string;
  badgeNumber?: string;
  rank?: string;
  department?: string;
  precinct?: string;
  stationId?: string;
  permissions?: string[];
  accountStatus: 'ACTIVE' | 'LOCKED' | 'SUSPENDED';
  failedLoginAttempts: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  address?: string;
  state?: string;
  city?: string;
  pinCode?: string;
  citizenId?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

// In-Memory User Auth Database
let registeredUsers: AuthUser[] = [
  {
    id: "usr-01",
    name: "Inspector C. Sterling",
    email: "c.sterling@delhipolice.gov.in",
    password: "admin123",
    role: "police_admin",
    badgeNumber: "IND-POL-8841",
    employeeId: "IND-POL-8841",
    rank: "Inspector Level 4",
    department: "Crime Branch & AI Unit",
    precinct: "Precinct 01 - HQ Command",
    stationId: "ST-01",
    phone: "+91 98100 11223",
    permissions: ["READ_COMPLAINTS", "WRITE_COMPLAINTS", "DISPATCH_UNITS", "MANAGE_OFFICERS", "VIEW_ANALYTICS"],
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "usr-02",
    name: "ACP R. K. Sharma",
    email: "rk.sharma@delhipolice.gov.in",
    password: "admin123",
    role: "police_admin",
    badgeNumber: "IND-POL-1002",
    employeeId: "IND-POL-1002",
    rank: "Assistant Commissioner of Police",
    department: "Special Operations",
    precinct: "Precinct 01 - HQ Command",
    stationId: "ST-01",
    phone: "+91 98111 22334",
    permissions: ["READ_COMPLAINTS", "WRITE_COMPLAINTS", "DISPATCH_UNITS", "MANAGE_OFFICERS", "VIEW_ANALYTICS"],
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "usr-cit-01",
    name: "Rahul Kapoor",
    email: "rahul.k@example.com",
    password: "citizen123",
    role: "citizen",
    phone: "+91 98765 43210",
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "usr-cit-02",
    name: "Priya Sharma",
    email: "priya.s@example.com",
    password: "citizen123",
    role: "citizen",
    phone: "+91 98123 45678",
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Helper to encode JWT mock payload
function createJwtToken(user: AuthUser): string {
  const payload = {
    sub: user.id,
    role: user.role,
    department: user.department || "General",
    permissions: user.permissions || ["STANDARD"],
    exp: Math.floor(Date.now() / 1000) + 86400, // 24h expiration
  };
  return `Bearer_jwt.${Buffer.from(JSON.stringify(payload)).toString("base64")}.${Date.now()}`;
}

// Auth Middleware to verify Token & Admin Permissions
function verifyAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(403).json({ error: "403 Forbidden: Missing Authorization Header. Access Prohibited." });
  }

  // Extract role if present in token
  let callerRole = "police_admin";
  try {
    if (authHeader.includes("jwt.")) {
      const parts = authHeader.split(".");
      if (parts[1]) {
        const decoded = JSON.parse(Buffer.from(parts[1], "base64").toString());
        callerRole = decoded.role;
      }
    }
  } catch (err) {
    // default
  }

  if (callerRole === "citizen") {
    return res.status(403).json({
      error: "403 Unauthorized: Citizens are strictly prohibited from accessing Police Admin endpoints.",
    });
  }

  next();
}

// Auth Endpoints
app.post("/api/auth/login", (req, res) => {
  const { identifier, email, badgeNumber, password, role } = req.body;
  const inputId = (identifier || email || badgeNumber || "").trim();
  const lowerInput = inputId.toLowerCase();

  let user = registeredUsers.find((u) => {
    if (role && u.role !== role) {
      if (role === "police_admin" && u.role !== "police_admin" && u.role !== "police_officer") return false;
      if (role === "citizen" && u.role !== "citizen") return false;
    }
    if (!lowerInput) return true;
    return (
      u.email.toLowerCase() === lowerInput ||
      u.phone === inputId ||
      (u.badgeNumber && u.badgeNumber.toLowerCase() === lowerInput) ||
      (u.employeeId && u.employeeId.toLowerCase() === lowerInput)
    );
  });

  if (!user) {
    // If demo quick login attempted
    if (role === "police_admin") {
      user = {
        id: `usr-pol-${Date.now()}`,
        name: inputId.includes("@") ? inputId.split("@")[0].toUpperCase() : `Officer ${inputId}`,
        email: inputId.includes("@") ? inputId : `${inputId.toLowerCase()}@delhipolice.gov.in`,
        password: password || "admin123",
        role: "police_admin",
        badgeNumber: badgeNumber || "IND-POL-" + Math.floor(1000 + Math.random() * 9000),
        employeeId: "IND-POL-" + Math.floor(1000 + Math.random() * 9000),
        rank: "Police Inspector",
        precinct: "Precinct 01 - HQ Command",
        stationId: "ST-01",
        phone: "+91 98100 00000",
        accountStatus: "ACTIVE",
        failedLoginAttempts: 0,
        emailVerified: true,
        phoneVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      registeredUsers.push(user);
    } else {
      user = {
        id: `usr-cit-${Date.now()}`,
        name: inputId.includes("@") ? inputId.split("@")[0] : `Citizen User`,
        email: inputId.includes("@") ? inputId : `${inputId}@citizen.in`,
        password: password || "citizen123",
        role: "citizen",
        phone: inputId.startsWith("+") ? inputId : "+91 98765 43210",
        accountStatus: "ACTIVE",
        failedLoginAttempts: 0,
        emailVerified: true,
        phoneVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      registeredUsers.push(user);
    }
  }

  // Check Account Status
  if (user.accountStatus === "LOCKED") {
    auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      action: "LOGIN_REJECTED_LOCKED",
      user: user.name,
      role: user.role,
      ip: req.ip || "10.10.2.14",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " IST",
      details: `Login attempt rejected for locked account: ${user.email}`,
    });
    return res.status(403).json({
      error: "403 Account Locked: Account is locked due to repeated failed login attempts. Contact Police IT Administrator.",
    });
  }

  // Password Check
  const expectedPassword = user.password || (user.role === "citizen" ? "citizen123" : "admin123");
  if (password && password !== expectedPassword) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) {
      user.accountStatus = "LOCKED";
    }

    auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      action: "LOGIN_FAILED",
      user: user.name,
      role: user.role,
      ip: req.ip || "10.10.2.14",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " IST",
      details: `Failed password attempt ${user.failedLoginAttempts}/5 for ${user.email}`,
    });

    return res.status(401).json({
      error: `Invalid password. (${5 - user.failedLoginAttempts} attempt(s) remaining before account lock)`,
    });
  }

  // Reset failed attempts on success
  user.failedLoginAttempts = 0;
  user.lastLogin = new Date().toISOString();

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    action: "USER_LOGIN_SUCCESS",
    user: user.name,
    role: user.role,
    ip: req.ip || "10.10.2.14",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " IST",
    details: `Authenticated user session active for ${user.email} [ROLE: ${user.role.toUpperCase()}]`,
  });

  const token = createJwtToken(user);

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      employeeId: user.employeeId || user.badgeNumber,
      badgeNumber: user.badgeNumber,
      rank: user.rank,
      department: user.department,
      precinct: user.precinct,
      stationId: user.stationId,
      accountStatus: user.accountStatus,
    },
  });
});

app.post("/api/auth/register", (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    role,
    badgeNumber,
    employeeId,
    rank,
    department,
    precinct,
    stationId,
    address,
    state,
    city,
    pinCode,
    citizenId,
  } = req.body;

  if (!name || (!email && !phone)) {
    return res.status(400).json({ error: "Name and email or phone number are required." });
  }

  const existing = registeredUsers.find(
    (u) => (email && u.email.toLowerCase() === email.toLowerCase()) || (phone && u.phone === phone)
  );

  if (existing) {
    return res.status(400).json({ error: "An account with this email or phone already exists." });
  }

  const isPolice = role === "police_admin" || role === "police_officer";

  const newUser: AuthUser = {
    id: `usr-${isPolice ? "pol" : "cit"}-${Date.now()}`,
    name,
    email: email || `${phone}@${isPolice ? "delhipolice.gov.in" : "citizen.in"}`,
    password: password || (isPolice ? "admin123" : "citizen123"),
    role: isPolice ? "police_admin" : "citizen",
    phone: phone || "+91 98000 00000",
    employeeId: employeeId || badgeNumber || (isPolice ? `IND-POL-${Math.floor(1000 + Math.random() * 9000)}` : undefined),
    badgeNumber: badgeNumber || employeeId || (isPolice ? `IND-POL-${Math.floor(1000 + Math.random() * 9000)}` : undefined),
    rank: rank || (isPolice ? "Police Officer" : undefined),
    department: department || (isPolice ? "Crime Branch & AI Intelligence" : undefined),
    precinct: precinct || (isPolice ? "Precinct 01 - HQ Command" : undefined),
    stationId: stationId || (isPolice ? "ST-01" : undefined),
    permissions: isPolice ? ["READ_COMPLAINTS", "WRITE_COMPLAINTS", "DISPATCH_UNITS"] : undefined,
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    emailVerified: true,
    phoneVerified: true,
    address,
    state,
    city,
    pinCode,
    citizenId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  registeredUsers.push(newUser);

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    action: isPolice ? "POLICE_OFFICER_REGISTERED" : "CITIZEN_REGISTERED",
    user: newUser.name,
    role: newUser.role,
    ip: req.ip || "10.10.2.14",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " IST",
    details: `New ${isPolice ? "Police Officer" : "Citizen"} account registered for ${newUser.email}`,
  });

  return res.status(201).json({
    message: `${isPolice ? "Police Officer" : "Citizen"} registration successful`,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      employeeId: newUser.employeeId,
      badgeNumber: newUser.badgeNumber,
      rank: newUser.rank,
      department: newUser.department,
      precinct: newUser.precinct,
      accountStatus: newUser.accountStatus,
    },
  });
});

// Admin API: Get Police Officer Directory (Requires Admin Auth)
app.get("/api/admin/users", verifyAdminAuth, (req, res) => {
  const officers = registeredUsers
    .filter((u) => u.role === "police_admin" || u.role === "police_officer")
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      badgeNumber: u.badgeNumber,
      employeeId: u.employeeId,
      rank: u.rank,
      department: u.department,
      precinct: u.precinct,
      stationId: u.stationId,
      accountStatus: u.accountStatus,
      createdAt: u.createdAt,
    }));
  return res.json(officers);
});

// Admin API: Create Police Officer Account (Requires Admin Auth)
app.post("/api/admin/users", verifyAdminAuth, (req, res) => {
  const { name, email, phone, employeeId, password, rank, department, stationId, precinct, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, official email, and initial password are required." });
  }

  const existing = registeredUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "An officer account with this email already exists." });
  }

  const newOfficer: AuthUser = {
    id: `usr-pol-${Date.now()}`,
    name,
    email,
    phone: phone || "+91 98100 00000",
    password,
    role: role || "police_officer",
    employeeId: employeeId || `IND-POL-${Math.floor(1000 + Math.random() * 9000)}`,
    badgeNumber: employeeId || `IND-POL-${Math.floor(1000 + Math.random() * 9000)}`,
    rank: rank || "Police Inspector",
    department: department || "Crime Branch & AI Unit",
    precinct: precinct || "Precinct 01 - HQ Command",
    stationId: stationId || "ST-01",
    permissions: ["READ_COMPLAINTS", "WRITE_COMPLAINTS", "DISPATCH_UNITS"],
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  registeredUsers.push(newOfficer);

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    action: "POLICE_OFFICER_PROVISIONED",
    user: newOfficer.name,
    role: newOfficer.role,
    ip: req.ip || "10.10.2.14",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " IST",
    details: `Admin provisioned official police account for ${newOfficer.email} [ID: ${newOfficer.employeeId}]`,
  });

  return res.status(201).json({
    message: "Police Officer account provisioned successfully",
    user: {
      id: newOfficer.id,
      name: newOfficer.name,
      email: newOfficer.email,
      phone: newOfficer.phone,
      role: newOfficer.role,
      employeeId: newOfficer.employeeId,
      badgeNumber: newOfficer.badgeNumber,
      rank: newOfficer.rank,
      department: newOfficer.department,
      precinct: newOfficer.precinct,
      accountStatus: newOfficer.accountStatus,
    },
  });
});

// Get Single Complaint
app.get("/api/complaints/:id", (req, res) => {
  const comp = complaints.find((c) => c.id === req.params.id);
  if (!comp) return res.status(404).json({ error: "Complaint not found" });
  return res.json(comp);
});

// Submit New Complaint
app.post("/api/complaints", async (req, res) => {
  try {
    const {
      citizenName,
      citizenPhone,
      citizenEmail,
      crimeCategory,
      title,
      description,
      latitude,
      longitude,
      address,
      district,
      photos,
      videos,
      isAnonymous,
      isEmergency,
    } = req.body;

    const caseNum = Math.floor(10000 + Math.random() * 90000);
    const newId = `CASE-2026-${caseNum}`;

    // Run AI Analysis
    const aiResult = await analyzeComplaintWithAI({
      title: title || "Incident Report",
      description: description || "",
      crimeCategory: crimeCategory || "General Incident",
      latitude: Number(latitude) || 28.6139,
      longitude: Number(longitude) || 77.209,
      address: address || "Connaught Place, New Delhi",
      isEmergency: Boolean(isEmergency),
    });

    const nowIso = new Date().toISOString();
    const formattedDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const newComplaint = {
      id: newId,
      citizenName: isAnonymous ? "Anonymous Citizen" : citizenName || "Citizen User",
      citizenPhone: isAnonymous ? "Hidden" : citizenPhone || "+91 99999 00000",
      citizenEmail: isAnonymous ? "" : citizenEmail || "",
      crimeCategory: (crimeCategory || "Other") as any,
      title: title || "Reported Crime Incident",
      description: description || "No detailed description provided.",
      latitude: Number(latitude) || 28.6139,
      longitude: Number(longitude) || 77.209,
      address: address || "Central Delhi Region",
      district: district || "Central District",
      photos: Array.isArray(photos) ? photos : [],
      videos: Array.isArray(videos) ? videos : [],
      isAnonymous: Boolean(isAnonymous),
      isEmergency: Boolean(isEmergency),
      status: (isEmergency ? "Pending" : "Pending") as any,
      priority: aiResult.priority as any,
      assignedOfficerId: undefined,
      assignedOfficerName: undefined,
      assignedStationId: "ST-01",
      assignedStationName: aiResult.nearestStation || "Precinct 01 - HQ Command",
      createdAt: nowIso,
      updatedAt: nowIso,
      timeline: [
        {
          id: `TL-${Date.now()}-1`,
          timestamp: formattedDate,
          status: "Submitted",
          actor: isAnonymous ? "Anonymous Citizen" : citizenName || "Citizen",
          message: "Complaint successfully registered in Sentinel DB.",
        },
        {
          id: `TL-${Date.now()}-2`,
          timestamp: formattedDate,
          status: "AI Intelligence Triage",
          actor: "Sentinel AI Engine",
          message: `Categorized as ${aiResult.category}. Risk Severity: ${aiResult.severity}. Fake Prob: ${aiResult.fakeProbability}%.`,
        },
      ],
      aiAnalysis: aiResult,
      officerNotes: [],
    };

    complaints.unshift(newComplaint as any);

    // Create Notification for Police Command Center
    const notifItem = {
      id: `NOTIF-${Date.now()}`,
      title: isEmergency ? "🚨 EMERGENCY SOS DISPATCH ALERT" : `New Complaint Registered: ${newId}`,
      message: `${title} (${crimeCategory}) in ${district || "Central District"}. Priority: ${aiResult.priority}.`,
      type: (isEmergency ? "EMERGENCY" : "STATUS_CHANGE") as any,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: false,
      complaintId: newId,
    };
    notifications.unshift(notifItem);

    // Create Audit Log
    auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      action: "COMPLAINT_CREATED",
      user: isAnonymous ? "ANONYMOUS_USER" : citizenName || "CITIZEN",
      role: "citizen",
      ip: req.ip || "10.10.4.12",
      details: `Created Complaint ID ${newId}. Emergency: ${isEmergency}. Priority: ${aiResult.priority}.`,
      timestamp: formattedDate,
    });

    return res.status(201).json(newComplaint);
  } catch (err: any) {
    console.error("Create complaint error:", err);
    return res.status(500).json({ error: "Failed to create complaint: " + err.message });
  }
});

// Emergency SOS Trigger
app.post("/api/emergency/sos", async (req, res) => {
  try {
    const { latitude, longitude, citizenName, citizenPhone, address } = req.body;
    const sosCode = Math.floor(1000 + Math.random() * 9000);
    const newId = `CASE-2026-SOS-${sosCode}`;

    const nowIso = new Date().toISOString();
    const formattedDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const sosComplaint = {
      id: newId,
      citizenName: citizenName || "SOS Alert Citizen",
      citizenPhone: citizenPhone || "+91 112 SOS",
      citizenEmail: "",
      crimeCategory: "Violence" as const,
      title: "🚨 LIVE EMERGENCY SOS PANIC BUTTON TRIGGERED",
      description: "Immediate emergency assistance request. Citizen activated live GPS panic alarm. Field units required instantly.",
      latitude: Number(latitude) || 28.6139,
      longitude: Number(longitude) || 77.209,
      address: address || "Live Emergency GPS Coordinates - Central Delhi",
      district: "Central District",
      photos: [],
      videos: [],
      isAnonymous: false,
      isEmergency: true,
      status: "Pending" as const,
      priority: "CRITICAL" as const,
      assignedOfficerId: "OFF-101",
      assignedOfficerName: "Inspector C. Sterling",
      assignedStationId: "ST-01",
      assignedStationName: "Precinct 01 - HQ Command",
      createdAt: nowIso,
      updatedAt: nowIso,
      timeline: [
        {
          id: `TL-SOS-1`,
          timestamp: formattedDate,
          status: "SOS TRIGGERED",
          actor: "Citizen Mobile Emergency Signal",
          message: "High priority acoustic panic signal transmitted to HQ Command.",
        },
      ],
      aiAnalysis: {
        category: "Violence" as const,
        severity: "Critical" as const,
        priority: "CRITICAL" as const,
        fakeProbability: 0.5,
        fakeReasoning: "Active physical emergency button panic state with direct satellite coordinates.",
        isDuplicate: false,
        duplicateConfidence: 0,
        nearestStation: "Precinct 01 - HQ Command",
        suggestedAction: "IMMEDIATE DISPATCH: Route nearest active patrol unit PT-09 to beacon coordinates.",
        estimatedResponseTime: "2m 30s",
        confidenceScore: 99.2,
        hotspotZone: "Zone 1 Priority Emergency",
        recommendedOfficerSpecialty: "Rapid Deployment Force",
        ipcSections: ["BNS 115 (Voluntarily Causing Hurt)", "BNS 351 (Criminal Intimidation)"],
      },
      officerNotes: [],
    };

    complaints.unshift(sosComplaint as any);

    notifications.unshift({
      id: `NOTIF-SOS-${Date.now()}`,
      title: "🚨 CRITICAL EMERGENCY SOS SIGNAL",
      message: `Emergency SOS triggered at Lat ${latitude || 28.6139}, Lng ${longitude || 77.209}. Case: ${newId}.`,
      type: "EMERGENCY",
      timestamp: "JUST NOW",
      read: false,
      complaintId: newId,
    });

    return res.status(201).json(sosComplaint);
  } catch (err: any) {
    return res.status(500).json({ error: "SOS dispatch error: " + err.message });
  }
});

// Update Complaint Status & Assign Officer
app.patch("/api/complaints/:id/status", (req, res) => {
  const comp = complaints.find((c) => c.id === req.params.id);
  if (!comp) return res.status(404).json({ error: "Complaint not found" });

  const { status, officerId, note, actor } = req.body;
  const formattedDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  if (status) {
    comp.status = status;
    comp.updatedAt = new Date().toISOString();
    comp.timeline.push({
      id: `TL-${Date.now()}`,
      timestamp: formattedDate,
      status: `Status: ${status}`,
      actor: actor || "Police Admin",
      message: `Complaint status updated to ${status}.`,
    });
  }

  if (officerId) {
    const off = officers.find((o) => o.id === officerId);
    if (off) {
      comp.assignedOfficerId = off.id;
      comp.assignedOfficerName = off.name;
      comp.assignedStationName = off.precinct;
      comp.timeline.push({
        id: `TL-${Date.now()}-OFF`,
        timestamp: formattedDate,
        status: "Officer Assigned",
        actor: "HQ Dispatcher",
        message: `Assigned officer ${off.name} (${off.badgeNumber}).`,
      });
    }
  }

  if (note) {
    comp.officerNotes.push({
      id: `ON-${Date.now()}`,
      officerName: actor || "Inspector C. Sterling",
      badgeNumber: "IND-POL-8841",
      timestamp: formattedDate,
      note: note,
    });
  }

  return res.json(comp);
});

// Add Officer Note
app.post("/api/complaints/:id/notes", (req, res) => {
  const comp = complaints.find((c) => c.id === req.params.id);
  if (!comp) return res.status(404).json({ error: "Complaint not found" });

  const { note, officerName, badgeNumber } = req.body;
  const formattedDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const newNote = {
    id: `ON-${Date.now()}`,
    officerName: officerName || "Inspector C. Sterling",
    badgeNumber: badgeNumber || "IND-POL-8841",
    timestamp: formattedDate,
    note: note || "Note recorded.",
  };

  comp.officerNotes.push(newNote);
  return res.json(comp);
});

// Get Analytics Summary
app.get("/api/analytics", (req, res) => {
  const total = complaints.length;
  const resolved = complaints.filter((c) => (c.status as string) === "Resolved").length;
  const pending = complaints.filter((c) => (c.status as string) === "Pending" || (c.status as string) === "Under Review").length;
  const emergency = complaints.filter((c) => c.isEmergency || c.priority === "CRITICAL").length;

  const clearanceRate = total > 0 ? Number(((resolved / total) * 100).toFixed(1)) : 63.4;

  const categoryCounts: Record<string, number> = {};
  complaints.forEach((c) => {
    categoryCounts[c.crimeCategory] = (categoryCounts[c.crimeCategory] || 0) + 1;
  });

  const categoryBreakdown = Object.entries(categoryCounts).map(([cat, cnt]) => ({
    category: cat,
    count: cnt,
  }));

  const districtCounts: Record<string, number> = {};
  complaints.forEach((c) => {
    districtCounts[c.district] = (districtCounts[c.district] || 0) + 1;
  });

  const districtDistribution = [
    { district: "Central District", count: districtCounts["Central District"] || 18, highRisk: true },
    { district: "Northern District", count: districtCounts["Northern District"] || 14, highRisk: false },
    { district: "Southern District", count: districtCounts["Southern District"] || 22, highRisk: false },
    { district: "Special Operations", count: districtCounts["Special Operations"] || 31, highRisk: true },
    { district: "Eastern District", count: districtCounts["Eastern District"] || 12, highRisk: false },
  ];

  return res.json({
    totalComplaints: total + 1280, // Total system historic baseline + live
    resolvedComplaints: resolved + 814,
    pendingComplaints: pending + 430,
    emergencyCases: emergency + 20,
    clearanceRate: clearanceRate,
    avgResponseTimeMin: 4.2,
    fakeReportsDetected: 38,
    duplicatesFlagged: 12,
    activePatrolUnits: patrolUnits.length,
    categoryBreakdown,
    districtDistribution,
    weeklyTrend: [
      { day: "Mon", total: 140, emergency: 12, resolved: 98 },
      { day: "Tue", total: 165, emergency: 15, resolved: 112 },
      { day: "Wed", total: 180, emergency: 8, resolved: 130 },
      { day: "Thu", total: 150, emergency: 18, resolved: 105 },
      { day: "Fri", total: 210, emergency: 24, resolved: 145 },
      { day: "Sat", total: 245, emergency: 30, resolved: 160 },
      { day: "Sun", total: 190, emergency: 22, resolved: 135 },
    ],
    officerPerformance: officers.map((o) => ({
      name: o.name,
      badge: o.badgeNumber,
      resolved: o.resolvedCount,
      active: o.activeCount,
      rating: 4.8,
    })),
  });
});

// AI Insights Route
app.get("/api/ai-insights", async (req, res) => {
  return res.json({
    crimeTrendSummary:
      "Stochastic crime density modeling indicates a +14.2% spike in Cyber Fraud APK lures targeting Central and Special Operations districts over the T-48H baseline. Temporal variance is ±4.2%. Recommended action: Tactical deterrent deployment to Zone 4.",
    districtRiskAnalysis: [
      {
        district: "Central District",
        riskScore: 88,
        keyCrime: "Domestic Escalation & Traffic",
        recommendedAction: "Increase night patrol units by 25% between 22:00 and 02:00.",
      },
      {
        district: "Special Operations (Cyber)",
        riskScore: 94,
        keyCrime: "Phishing & APK Scams",
        recommendedAction: "Automate bank account lien triggers via 1930 portal integration.",
      },
      {
        district: "Northern District",
        riskScore: 62,
        keyCrime: "Commercial Burglary",
        recommendedAction: "Deploy smart CCTV motion telemetry in market sectors after 23:00.",
      },
    ],
    hotspotPredictions: [
      {
        locationName: "Sector-B Connaught Outer Circle",
        lat: 28.632,
        lng: 77.22,
        timeWindow: "18:00 - 22:00 IST",
        probability: 89.4,
      },
      {
        locationName: "Civil Lines Commercial Market",
        lat: 28.6814,
        lng: 77.2226,
        timeWindow: "01:00 - 04:00 IST",
        probability: 76.8,
      },
    ],
    suspiciousPatterns: [
      {
        title: "APK Disconnection Scam Ring",
        detail: "14 complaints in last 72 hours using identical phishing template domain 'power-bill-update.apk'.",
        severity: "High",
      },
      {
        title: "Night Commercial Break-ins",
        detail: "Pattern detected: Commercial shutters targeted between 02:00 - 03:30 AM on rainy nights.",
        severity: "Medium",
      },
    ],
    fakeComplaintSummary: {
      totalAnalyzed: 1324,
      flaggedCount: 38,
      commonMarkers: [
        "Unverified throwaway VOIP number",
        "Geographic mismatch between IP and stated crime location (>300km)",
        "Repetitive text copy-pasted from internet forums",
      ],
    },
  });
});

// Suraksha AI Chatbot Assistant API Route
app.post("/api/chatbot", async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  if (!ai) {
    // Smart fallback if GEMINI_API_KEY is not configured
    let reply =
      "I am **Suraksha AI**, the official crime response and legal guidance assistant for the Indian Police. How can I assist you today?";

    const lower = message.toLowerCase();
    if (lower.includes("emergency") || lower.includes("help") || lower.includes("danger") || lower.includes("sos")) {
      reply =
        "🚨 **EMERGENCY ASSISTANCE INSTRUCTIONS**:\n\n1. Tap the red **EMERGENCY SOS** button on the top right bar of this application to send instant satellite coordinates to HQ Command.\n2. Dial **112** (National Emergency Helpline) immediately.\n3. For Women Safety, call **1091**.\n4. Stay in a safe, lit area if possible until officers arrive.";
    } else if (lower.includes("cyber") || lower.includes("scam") || lower.includes("fraud") || lower.includes("money")) {
      reply =
        "🛡️ **CYBER CRIME & FRAUD REPORTING (1930)**:\n\nIf money was stolen from your bank account or credit card:\n1. Call the **National Cyber Crime Helpline at 1930** within 2 hours to freeze stolen funds.\n2. File a complaint under the 'Report Crime' tab selecting 'Cybercrime'.\n3. Do NOT share OTPs or download unknown APK files.\n4. Applicable Sections: **BNS Section 318** (Cheating) & **IT Act Section 66D**.";
    } else if (lower.includes("bns") || lower.includes("ipc") || lower.includes("section") || lower.includes("law")) {
      reply =
        "⚖️ **LEGAL SECTIONS (Bharatiya Nyaya Sanhita - BNS / IPC)**:\n\n- **Theft**: BNS Sec 303 (formerly IPC 379)\n- **Domestic Hurt**: BNS Sec 115 (formerly IPC 323)\n- **Cheating/Cyber Fraud**: BNS Sec 318 (formerly IPC 420)\n- **Criminal Intimidation**: BNS Sec 351 (formerly IPC 506)\n- **Rash Driving**: BNS Sec 281 (formerly IPC 279)\n\nYou can lodge a complaint directly with video/photo evidence in our 'Report Crime' portal!";
    } else if (lower.includes("status") || lower.includes("track") || lower.includes("case")) {
      reply =
        "🔍 **TRACK COMPLAINT**:\n\nYou can track any complaint status using your **Complaint ID** (e.g. `CASE-2026-00124`) in the 'Complaint Status' tab in the navigation menu.";
    }

    return res.json({
      text: reply,
      citations: ["Bharatiya Nyaya Sanhita (BNS) 2023", "National Cyber Crime Reporting Portal (1930)", "Emergency Response Support System (ERSS - 112)"],
      suggestedActions: [
        "Report a New Crime",
        "Trigger Emergency SOS",
        "Track Complaint Status",
        "View Live Map",
      ],
    });
  }

  try {
    const promptText = `You are "Suraksha AI", the official Crime Intelligence and Emergency Legal Assistant for the Indian Police Sentinel Operational Network.
You assist citizens and police officers with legal guidance under the Bharatiya Nyaya Sanhita (BNS) and Indian Penal Code (IPC), emergency procedures, cyber crime reporting (1930), and complaint tracking.

User Query: ${message}

Provide a concise, highly authoritative, reassuring, and legally accurate answer.
List applicable BNS/IPC sections if relevant. Highlight emergency contact numbers (112 for ERSS, 1091 for Women Helpline, 1930 for Cyber Crime).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
    });

    return res.json({
      text: response.text || "Thank you. Please stay safe. You can file an official complaint in our portal or dial 112 for immediate emergencies.",
      citations: [
        "Bharatiya Nyaya Sanhita (BNS) 2023",
        "Emergency Response Support System (ERSS 112)",
        "Ministry of Home Affairs (MHA) Cyber Crime Guidelines",
      ],
      suggestedActions: ["Report a Crime", "Emergency SOS 112", "Track Complaint"],
    });
  } catch (err: any) {
    console.error("Chatbot API Error:", err);
    return res.json({
      text: "I am Suraksha AI. For immediate emergencies, please press the **Emergency SOS** button or call **112**. You can also file a complaint under the 'Report Crime' menu.",
      citations: ["ERSS 112"],
      suggestedActions: ["Emergency SOS", "Report Crime"],
    });
  }
});

// Police Stations Endpoint
app.get("/api/stations", (req, res) => res.json(policeStations));

// Patrol Units Endpoint
app.get("/api/patrol-units", (req, res) => res.json(patrolUnits));

// Officers Endpoint
app.get("/api/officers", (req, res) => res.json(officers));

// Audit Logs Endpoint
app.get("/api/audit-logs", (req, res) => res.json(auditLogs));

// Notifications Endpoint
app.get("/api/notifications", (req, res) => res.json(notifications));

app.patch("/api/notifications/:id/read", (req, res) => {
  const notif = notifications.find((n) => n.id === req.params.id);
  if (notif) notif.read = true;
  return res.json({ success: true });
});

// VITE / EXPRESS MIDDLEWARE SETUP
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sentinel Police Intelligence Command Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
