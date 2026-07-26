"""
Sentinel Real-Time WebSocket Connection Manager & Endpoints.
Handles live notifications, emergency SOS broadcasting, and dashboard auto-refresh.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["WebSockets"])


class ConnectionManager:
    """Manages active WebSocket client connections for real-time dispatch."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("WebSocket client connected", total_connections=len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("WebSocket client disconnected", total_connections=len(self.active_connections))

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast JSON payload to all connected clients."""
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning("Failed to send WS message, removing dead socket", error=str(e))
                self.disconnect(connection)


ws_manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for live platform telemetry.
    Receives pings and broadcasts real-time SOS alerts & complaint updates.
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive & receive client heartbeats/messages
            data = await websocket.receive_text()
            # Send acknowledgement ping
            await websocket.send_json({
                "event": "PONG",
                "message": "Sentinel real-time node operational",
                "timestamp": data,
            })
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error("WebSocket endpoint error", error=str(e))
        ws_manager.disconnect(websocket)
