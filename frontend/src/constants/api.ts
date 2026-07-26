/// <reference types="vite/client" />

/**
 * API Constants & Endpoints Configuration
 * Backend Base URL
 */

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://127.0.0.1:8001/api/v1";

export const API_ENDPOINTS = {
  // ==========================
  // Authentication
  // ==========================

  // Default citizen endpoints
  LOGIN: `${API_BASE_URL}/auth/login/citizen`,
  REGISTER: `${API_BASE_URL}/auth/register/citizen`,

  // Explicit endpoints
  CITIZEN_LOGIN: `${API_BASE_URL}/auth/login/citizen`,
  POLICE_LOGIN: `${API_BASE_URL}/auth/login/police`,

  CITIZEN_REGISTER: `${API_BASE_URL}/auth/register/citizen`,

  REFRESH: `${API_BASE_URL}/auth/refresh`,
  ME: `${API_BASE_URL}/auth/me`,
  FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
  VERIFY_EMAIL: `${API_BASE_URL}/auth/verify-email`,

  // ==========================
  // Complaints
  // ==========================
  COMPLAINTS: `${API_BASE_URL}/complaints`,
  COMPLAINT_BY_ID: (id: string) =>
    `${API_BASE_URL}/complaints/${id}`,
  COMPLAINT_STATUS: (id: string) =>
    `${API_BASE_URL}/complaints/${id}/status`,
  COMPLAINT_NOTES: (id: string) =>
    `${API_BASE_URL}/complaints/${id}/notes`,
  EMERGENCY_SOS: `${API_BASE_URL}/emergency/sos`,

  // ==========================
  // Police
  // ==========================
  STATIONS: `${API_BASE_URL}/stations`,
  PATROL_UNITS: `${API_BASE_URL}/patrol-units`,

  // ==========================
  // Analytics
  // ==========================
  ANALYTICS: `${API_BASE_URL}/analytics`,
  AI_INSIGHTS: `${API_BASE_URL}/ai-insights`,

  // ==========================
  // Admin
  // ==========================
  OFFICERS: `${API_BASE_URL}/admin/users`,
  AUDIT_LOGS: `${API_BASE_URL}/audit-logs`,

  // ==========================
  // Chatbot
  // ==========================
  CHATBOT: `${API_BASE_URL}/chatbot`,

  // ==========================
  // Notifications
  // ==========================
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
  MARK_NOTIFICATION_READ: (id: string) =>
    `${API_BASE_URL}/notifications/${id}/read`,
};