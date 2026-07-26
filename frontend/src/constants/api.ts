/// <reference types="vite/client" />

/**
 * API Constants & Endpoints Configuration
 *
 * In production (Vercel), VITE_API_BASE_URL is set in .env.production:
 *   VITE_API_BASE_URL=https://sentinel-backend-tftw.onrender.com/api/v1
 *
 * In development, falls back to local backend.
 */

export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export const API_ENDPOINTS = {
  // ==========================
  // Authentication
  // ==========================
  LOGIN: `${API_BASE_URL}/auth/login/citizen`,
  REGISTER: `${API_BASE_URL}/auth/register/citizen`,

  CITIZEN_LOGIN: `${API_BASE_URL}/auth/login/citizen`,
  POLICE_LOGIN: `${API_BASE_URL}/auth/login/police`,
  CITIZEN_REGISTER: `${API_BASE_URL}/auth/register/citizen`,

  REFRESH: `${API_BASE_URL}/auth/refresh`,
  ME: `${API_BASE_URL}/auth/me`,
  FORGOT_PASSWORD: `${API_BASE_URL}/auth/password/reset/request`,
  VERIFY_EMAIL: `${API_BASE_URL}/auth/verify/email`,

  // ==========================
  // Complaints
  // ==========================
  COMPLAINTS: `${API_BASE_URL}/complaints`,
  COMPLAINT_BY_ID: (id: string) => `${API_BASE_URL}/complaints/${id}`,
  COMPLAINT_STATUS: (id: string) => `${API_BASE_URL}/complaints/${id}/status`,
  COMPLAINT_NOTES: (id: string) => `${API_BASE_URL}/complaints/${id}/notes`,
  EMERGENCY_SOS: `${API_BASE_URL}/emergency/sos`,

  // ==========================
  // Police / Locations
  // ==========================
  STATIONS: `${API_BASE_URL}/stations`,
  PATROL_UNITS: `${API_BASE_URL}/patrol-units`,

  // ==========================
  // Analytics
  // ==========================
  ANALYTICS: `${API_BASE_URL}/analytics`,
  AI_INSIGHTS: `${API_BASE_URL}/analytics/insights`,

  // ==========================
  // Admin / Officers
  // ==========================
  OFFICERS: `${API_BASE_URL}/admin/users`,
  AUDIT_LOGS: `${API_BASE_URL}/audit/logs`,

  // ==========================
  // Chatbot
  // ==========================
  CHATBOT: `${API_BASE_URL}/chatbot/message`,

  // ==========================
  // Notifications
  // ==========================
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
  MARK_NOTIFICATION_READ: (id: string) => `${API_BASE_URL}/notifications/${id}/read`,
};