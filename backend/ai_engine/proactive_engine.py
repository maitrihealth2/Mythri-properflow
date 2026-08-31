import asyncio
import logging
import time
import os
import json
from typing import Dict
from fastapi import WebSocket
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps session_id (or user_id) to WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # Track last activity time per session to trigger proactive messages
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

async def trigger_proactive_message(session_id: str):
    """Generates and sends a proactive check-in message to a silent user."""
    from core.database.models import SessionLocal, Session as DBSession, LivingUserContext, Message
    from providers.sarvam.sarvam_client import CONVERSATIONAL_SYSTEM_PROMPT
    
    db = SessionLocal()
    try:
        session = db.query(DBSession).filter(DBSession.session_token == session_id).first()
        if not session:
            return
            
        context = db.query(LivingUserContext).filter(LivingUserContext.user_id == session.user_id).first()
        active_themes = context.active_themes if context else {}
        
        # Determine if we should intervene
        needs_intervention = False
        concern_context = ""
        for theme, details in active_themes.items():
            if details.get("status") in ["WORSENING", "CONTINUING"] or details.get("distress_score", 0) > 0.6:
                needs_intervention = True
                concern_context = f"The user has been struggling with: {theme}. It is {details.get('status')}. Their distress level was {details.get('distress_score')}."
                break
                
        if not needs_intervention:
            return # Only interrupt if they are actually struggling
            
        await manager.send_json(session_id, {"type": "typing_start"})
        
        client = AsyncOpenAI(api_key=os.getenv("SARVAM_API_KEY"), base_url="https://api.sarvam.ai/v1")
        
        prompt = (
            f"You are checking in on the user proactively because they have been silent for a while.\n"
            f"Context: {concern_context}\n"
            f"Write a short, natural, empathetic message checking in on them. "
            f"Use the Strategic Resolution strategy: don't just passively listen, gently guide them or interrupt negative loops. "
            f"Do not ask a question if it feels forced."
        )
        
        response = await client.chat.completions.create(
            model="sarvam-105b-conversations",
            messages=[
                {"role": "system", "content": CONVERSATIONAL_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=150
        )
        
        ai_text = response.choices[0].message.content.strip()
        
        # Save to DB
        ai_msg = Message(session_id=session.id, role="assistant", content=ai_text)
        db.add(ai_msg)
        db.commit()
        
        await manager.send_json(session_id, {"type": "proactive_message", "content": ai_text})
        await manager.send_json(session_id, {"type": "typing_stop"})
        
        # Reset activity timer so we don't spam
        manager.update_activity(session_id)
        logger.info(f"Sent proactive message to {session_id}: {ai_text}")
        
    except Exception as e:
        logger.error(f"Error in proactive generation: {e}")
        try:
            await manager.send_json(session_id, {"type": "typing_stop"})
        except:
            pass
    finally:
        db.close()

async def proactive_monitoring_loop():
    """Background daemon that sweeps active sessions for silence."""
    logger.info("Starting Proactive Monitoring Loop")
    SILENCE_THRESHOLD = 45 # seconds
    
    while True:
        try:
            current_time = time.time()
            to_trigger = []
            
            for session_id, last_active in manager.last_activity.items():
                if current_time - last_active > SILENCE_THRESHOLD:
                    to_trigger.append(session_id)
                    
            for session_id in to_trigger:
                # Mark as triggered immediately to prevent multiple concurrent generations
                manager.update_activity(session_id)
                asyncio.create_task(trigger_proactive_message(session_id))
                
        except Exception as e:
            logger.error(f"Proactive loop error: {e}")
            
        await asyncio.sleep(10)
