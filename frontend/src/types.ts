export type UserRole = 'citizen' | 'police_officer' | 'police_admin';

export type CrimeCategory = 
  | 'Cybercrime'
  | 'Violence'
  | 'Theft/Burglary'
  | 'Traffic Incident'
  | 'Harassment'
  | 'Fraud/Scam'
  | 'Narcotics'
  | 'Domestic Escalation'
  | 'Organized Crime'
  | 'Other';

export type ComplaintStatus = 
  | 'Pending'
  | 'Under Review'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Rejected'
  | 'Forwarded';

export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'ROUTINE';

export interface User {
  id: string;
  full_name: string;
  name?: string; // alias kept for backward compat, maps to full_name
  email: string;
  phone: string;
  role: UserRole;
  employeeId?: string;
  employee_id?: string;
  badgeNumber?: string;
  badge_number?: string;
  rank?: string;
  department?: string;
  specialty?: string;
  precinct?: string;
  stationId?: string;
  station_id?: string;
  stationName?: string;
  station_name?: string;
  district?: string;
  avatarUrl?: string;
  avatar_url?: string;
  accountStatus?: string;
  account_status?: string;
  address?: string;
  state?: string;
  city?: string;
  pinCode?: string;
  pin_code?: string;
  citizenId?: string;
  emailVerified?: boolean;
  email_verified?: boolean;
  phoneVerified?: boolean;
  phone_verified?: boolean;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  status: string;
  actor: string;
  message: string;
}

export interface OfficerNote {
  id: string;
  officerName: string;
  badgeNumber: string;
  timestamp: string;
  note: string;
}

export interface AIAnalysis {
  category: CrimeCategory;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  priority: PriorityLevel;
  fakeProbability: number; // 0-100
  fakeReasoning: string;
  isDuplicate: boolean;
  matchedComplaintId?: string;
  duplicateConfidence: number; // 0-100
  nearestStation: string;
  suggestedAction: string;
  estimatedResponseTime: string;
  confidenceScore: number; // 0-100
  hotspotZone?: string;
  recommendedOfficerSpecialty?: string;
  ipcSections?: string[];
}

export interface Complaint {
  id: string;
  citizenName: string;
  citizenPhone: string;
  citizenEmail: string;
  crimeCategory: CrimeCategory;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  district: string;
  photos: string[];
  videos: string[];
  isAnonymous: boolean;
  isEmergency: boolean;
  status: ComplaintStatus;
  priority: PriorityLevel;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  assignedStationId?: string;
  assignedStationName?: string;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEvent[];
  aiAnalysis: AIAnalysis;
  officerNotes: OfficerNote[];
}

export interface PoliceStation {
  id: string;
  name: string;
  code: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  inCharge: string;
  activeOfficers: number;
  activeCases: number;
}

export interface PatrolUnit {
  id: string;
  unitCode: string;
  type: 'PATROL' | 'SWAT' | 'INTERCEPTOR' | 'K-9' | 'TRAFFIC';
  status: 'ON SCENE' | 'EN ROUTE' | 'PATROLLING' | 'DISPATCHED' | 'STANDBY';
  assignedCaseId?: string;
  latitude: number;
  longitude: number;
  batteryOrFuel: number;
  speedKmh: number;
  lastPing: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'EMERGENCY' | 'ASSIGNMENT' | 'STATUS_CHANGE' | 'SYSTEM';
  timestamp: string;
  read: boolean;
  complaintId?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  role: string;
  ip: string;
  details: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
  citations?: string[];
  suggestedActions?: string[];
}

export interface AnalyticsSummary {
  totalComplaints: number;
  resolvedComplaints: number;
  pendingComplaints: number;
  emergencyCases: number;
  clearanceRate: number; // percentage
  avgResponseTimeMin: number;
  fakeReportsDetected: number;
  duplicatesFlagged: number;
  activePatrolUnits: number;
  categoryBreakdown: { category: string; count: number }[];
  districtDistribution: { district: string; count: number; highRisk: boolean }[];
  weeklyTrend: { day: string; total: number; emergency: number; resolved: number }[];
  officerPerformance: { name: string; badge: string; resolved: number; active: number; rating: number }[];
}

export interface AIInsightsData {
  crimeTrendSummary: string;
  districtRiskAnalysis: { district: string; riskScore: number; keyCrime: string; recommendedAction: string }[];
  hotspotPredictions: { locationName: string; lat: number; lng: number; timeWindow: string; probability: number }[];
  suspiciousPatterns: { title: string; detail: string; severity: 'High' | 'Medium' | 'Low' }[];
  fakeComplaintSummary: { totalAnalyzed: number; flaggedCount: number; commonMarkers: string[] };
}
