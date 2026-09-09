import asyncio
import logging
import time
from typing import Dict
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps session_id to WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        self.last_activity: Dict[str, float] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        self.last_activity[session_id] = time.time()
        logger.info(f"Session {session_id} connected via WebSocket")

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.last_activity:
            del self.last_activity[session_id]
        logger.info(f"Session {session_id} disconnected via WebSocket")

    def update_activity(self, session_id: str):
        self.last_activity[session_id] = time.time()

    async def send_json(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to {session_id}: {e}")
                self.disconnect(session_id)

manager = ConnectionManager()

# Proactive auto-messaging loop has been disabled to ensure the AI never speaks unprompted.
async def proactive_monitoring_loop():
    """No-op background function preserved for backward compatibility."""
    return
