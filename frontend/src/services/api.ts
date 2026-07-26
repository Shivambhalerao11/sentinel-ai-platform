import {
  Complaint,
  PoliceStation,
  PatrolUnit,
  AnalyticsSummary,
  AIInsightsData,
  AuditLog,
  NotificationItem,
  User,
} from "../types";

import apiClient from "./apiClient";
import { API_ENDPOINTS } from "../constants/api";

// ==========================================
// AUTH
// ==========================================

export async function loginUser(payload: {
  identifier?: string;
  email?: string;
  badgeNumber?: string;
  password?: string;
  role?: string;
}): Promise<{ tokens: { access_token: string; refresh_token: string; token_type: string; expires_in: number }; user: User; message: string }> {
  // Route to correct endpoint: police roles go to police login
  const isPolice = payload.role === "police_admin" || payload.role === "police_officer" || payload.role === "police";
  const endpoint = isPolice
    ? API_ENDPOINTS.POLICE_LOGIN
    : API_ENDPOINTS.CITIZEN_LOGIN;

  // Police login expects { identifier, password }; citizen same
  const body: Record<string, string | undefined> = {
    identifier: payload.identifier || payload.email,
    password: payload.password,
  };

  const res = await apiClient.post(endpoint, body);

  // Persist tokens from the nested `tokens` object
  const { tokens, user } = res.data;
  if (tokens?.access_token) {
    localStorage.setItem("sentinel_access_token", tokens.access_token);
  }
  if (tokens?.refresh_token) {
    localStorage.setItem("sentinel_refresh_token", tokens.refresh_token);
  }
  if (user) {
    localStorage.setItem("sentinel_user_data", JSON.stringify(user));
  }

  return res.data;
}

export async function registerUser(payload: {
  full_name: string;
  email: string;
  phone: string;
  password: string;

  address?: string;
  state?: string;
  city?: string;
  pin_code?: string;
  citizen_id?: string;

  role?: string;
}): Promise<{ tokens: { access_token: string; refresh_token: string; token_type: string; expires_in: number }; user: User; message: string }> {
  const endpoint = API_ENDPOINTS.CITIZEN_REGISTER;

  const res = await apiClient.post(endpoint, payload);

  const { tokens, user } = res.data;
  if (tokens?.access_token) {
    localStorage.setItem("sentinel_access_token", tokens.access_token);
  }
  if (tokens?.refresh_token) {
    localStorage.setItem("sentinel_refresh_token", tokens.refresh_token);
  }
  if (user) {
    localStorage.setItem("sentinel_user_data", JSON.stringify(user));
  }

  return res.data;
}

export async function sendEmailOtp(
  email: string,
  purpose: "REGISTRATION" | "PASSWORD_RESET" = "REGISTRATION"
): Promise<{ message: string; debug_otp?: string }> {
  const res = await apiClient.post(API_ENDPOINTS.SEND_OTP, { email, purpose });
  return res.data;
}

export async function verifyEmailOtp(
  email: string,
  otp_code: string,
  purpose: "REGISTRATION" | "PASSWORD_RESET" = "REGISTRATION"
): Promise<{ message: string }> {
  const res = await apiClient.post(API_ENDPOINTS.VERIFY_OTP, { email, otp_code, purpose });
  return res.data;
}

export async function registerPoliceOfficer(payload: {
  full_name: string;
  email: string;
  phone: string;
  employee_id: string;
  badge_number: string;
  password: string;
  rank: string;
  department?: string;
  specialty?: string;
  station_id?: string;
  precinct?: string;
  role?: string;
}): Promise<{ tokens: { access_token: string; refresh_token: string; token_type: string; expires_in: number }; user: User; message: string }> {
  const res = await apiClient.post(API_ENDPOINTS.POLICE_REGISTER, payload);

  const { tokens, user } = res.data;
  if (tokens?.access_token) {
    localStorage.setItem("sentinel_access_token", tokens.access_token);
  }
  if (tokens?.refresh_token) {
    localStorage.setItem("sentinel_refresh_token", tokens.refresh_token);
  }
  if (user) {
    localStorage.setItem("sentinel_user_data", JSON.stringify(user));
  }

  return res.data;
}

export async function resetPasswordWithOtp(
  email: string,
  otp_code: string,
  new_password: string,
  confirm_password: string
): Promise<{ message: string }> {
  const res = await apiClient.post(API_ENDPOINTS.RESET_PASSWORD_OTP, {
    email,
    otp_code,
    new_password,
    confirm_password,
  });
  return res.data;
}

export async function createOfficerAccount(
  token: string,
  payload: {
    name: string;
    email: string;
    phone: string;
    employeeId: string;
    password: string;
    rank: string;
    department: string;
    stationId: string;
    precinct: string;
    role: "police_admin" | "police_officer";
  }
): Promise<{ message: string; user: User }> {
  // Map camelCase frontend fields to snake_case backend PoliceRegisterRequest
  const body = {
    full_name: payload.name,
    email: payload.email,
    phone: payload.phone,
    employee_id: payload.employeeId,
    badge_number: payload.employeeId, // use same value as badge if not separately provided
    password: payload.password,
    rank: payload.rank,
    department: payload.department,
    station_id: payload.stationId,
    precinct: payload.precinct,
    role: payload.role,
  };

  const res = await apiClient.post(API_ENDPOINTS.OFFICERS, body, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
}

export async function fetchOfficerList(
  token?: string
): Promise<User[]> {
  const headers = token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined;

  const res = await apiClient.get(API_ENDPOINTS.OFFICERS, {
    headers,
  });

  return res.data;
}

// ==========================================
// COMPLAINTS
// ==========================================

export async function fetchComplaints(filters?: {
  search?: string;
  category?: string;
  status?: string;
  priority?: string;
  district?: string;
}): Promise<Complaint[]> {
  const params: Record<string, string> = {};

  if (filters?.search) params.search = filters.search;
  if (filters?.category) params.category = filters.category;
  if (filters?.status) params.status = filters.status;
  if (filters?.priority) params.priority = filters.priority;
  if (filters?.district) params.district = filters.district;

  const res = await apiClient.get(API_ENDPOINTS.COMPLAINTS, {
    params,
  });

  return res.data;
}

export async function fetchComplaintById(
  id: string
): Promise<Complaint> {
  const res = await apiClient.get(
    API_ENDPOINTS.COMPLAINT_BY_ID(id)
  );

  return res.data;
}

export async function submitComplaint(
  payload: any
): Promise<Complaint> {
  const res = await apiClient.post(
    API_ENDPOINTS.COMPLAINTS,
    payload
  );

  return res.data;
}

export async function triggerEmergencySos(payload: {
  latitude: number;
  longitude: number;
  citizenName?: string;
  citizenPhone?: string;
  address?: string;
}): Promise<Complaint> {
  // Map camelCase to snake_case for SOSCreateRequest
  const body = {
    latitude: payload.latitude,
    longitude: payload.longitude,
    citizen_name: payload.citizenName,
    citizen_phone: payload.citizenPhone,
    address: payload.address,
  };

  const res = await apiClient.post(
    API_ENDPOINTS.EMERGENCY_SOS,
    body
  );

  return res.data;
}

export async function updateComplaintStatus(
  id: string,
  data: {
    status?: string;
    officerId?: string;
    note?: string;
    actor?: string;
  }
): Promise<Complaint> {
  // Map camelCase to snake_case for ComplaintStatusUpdateRequest
  const body = {
    status: data.status,
    officer_id: data.officerId,
    note: data.note,
  };

  const res = await apiClient.patch(
    API_ENDPOINTS.COMPLAINT_STATUS(id),
    body
  );

  return res.data;
}

export async function addOfficerNote(
  id: string,
  data: {
    note: string;
    officerName?: string;
    badgeNumber?: string;
  }
): Promise<Complaint> {
  const res = await apiClient.post(
    API_ENDPOINTS.COMPLAINT_NOTES(id),
    data
  );

  return res.data;
}

// ==========================================
// ANALYTICS
// ==========================================

export async function fetchAnalytics(): Promise<AnalyticsSummary> {
  const res = await apiClient.get(API_ENDPOINTS.ANALYTICS);

  return res.data;
}

export async function fetchAiInsights(): Promise<AIInsightsData> {
  const res = await apiClient.get(API_ENDPOINTS.AI_INSIGHTS);

  return res.data;
}

// ==========================================
// STATIONS
// ==========================================

export async function fetchPoliceStations(): Promise<
  PoliceStation[]
> {
  const res = await apiClient.get(API_ENDPOINTS.STATIONS);

  return res.data;
}

export async function fetchPatrolUnits(): Promise<
  PatrolUnit[]
> {
  const res = await apiClient.get(API_ENDPOINTS.PATROL_UNITS);

  return res.data;
}

// ==========================================
// AUDIT
// ==========================================

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await apiClient.get(API_ENDPOINTS.AUDIT_LOGS);

  return res.data;
}

// ==========================================
// NOTIFICATIONS
// ==========================================

export async function fetchNotifications(): Promise<
  NotificationItem[]
> {
  const res = await apiClient.get(
    API_ENDPOINTS.NOTIFICATIONS
  );

  return res.data;
}

export async function markNotificationRead(
  id: string
): Promise<void> {
  await apiClient.patch(
    API_ENDPOINTS.MARK_NOTIFICATION_READ(id)
  );
}

// ==========================================
// CHATBOT
// ==========================================

export async function sendChatbotMessage(
  message: string,
  history?: any[]
) {
  const res = await apiClient.post(
    API_ENDPOINTS.CHATBOT,
    {
      message,
      history,
    }
  );

  return res.data;
}