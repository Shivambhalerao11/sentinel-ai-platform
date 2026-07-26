"""
Main v1 API router.
All endpoint routers are registered here with their prefixes.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    analytics, audit, auth, chatbot, complaints, locations, notifications, officers, websockets
)

api_router = APIRouter(prefix="/api/v1")

# Auth routes
api_router.include_router(auth.router)

# Core complaint routes (no prefix - uses /complaints and /emergency)
api_router.include_router(complaints.router)

# Analytics routes
api_router.include_router(analytics.router)

# Location routes (stations, patrol units, districts)
api_router.include_router(locations.router)

# Notification routes
api_router.include_router(notifications.router)

# Chatbot routes
api_router.include_router(chatbot.router)

# Audit log routes
api_router.include_router(audit.router)

# Officer management routes
api_router.include_router(officers.router)

# WebSocket real-time routes
api_router.include_router(websockets.router)
