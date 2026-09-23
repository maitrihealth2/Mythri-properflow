import os
import json
import asyncio
import websockets
import base64
import traceback
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from modules.dashboard.api import broadcast_event
from core.database.models import get_db, Session as DBSession, User
from modules.voice.api import handle_voice_turn

import pathlib

_BASE = pathlib.Path(__file__).resolve().parent.parent.parent
load_dotenv(_BASE / ".env")
load_dotenv(_BASE / ".env.local", override=True)

from security.authentication.service import decode_token

router = APIRouter(prefix="/api/streaming", tags=["streaming"])
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

@router.websocket("/ws/stream/{session_id}")
async def streaming_stt(websocket: WebSocket, session_id: str, token: str = None):
    headers = dict(websocket.headers)
    origin = headers.get("origin", "No Origin")
    host = headers.get("host", "No Host")
    print(f"[WS] Attempting connection. Session: {session_id}, Origin: {origin}, Host: {host}")
    
    # ── Authenticate Token ──
    raw_token = token or websocket.query_params.get("token")
    payload = decode_token(raw_token) if raw_token else None
    if not payload or not payload.get("user_id"):
        print(f"[WS] Unauthorized WebSocket connection attempt for session: {session_id}")
        await websocket.close(code=1008, reason="Authentication failed")
        return
        
    auth_user_id = payload.get("user_id")

    # ── Verify Session Ownership ──
    def _lookup_user_and_session():
        generator = get_db()
        db = next(generator)
        try:
            db_session = db.query(DBSession).filter(
                (DBSession.session_token == session_id) | (DBSession.id == (int(session_id) if session_id.isdigit() else -1))
            ).first()
            if not db_session or db_session.user_id != auth_user_id:
                return None, None
            user = db.query(User).get(auth_user_id)
            return user, db_session
        finally:
            try: next(generator) 
            except StopIteration: pass
            
    current_user, db_session = await asyncio.to_thread(_lookup_user_and_session)
    if not current_user or not db_session:
        print(f"[WS] Forbidden: User {auth_user_id} does not own session {session_id}")
        await websocket.close(code=1008, reason="Unauthorized session access")
        return
    
    try:
        await websocket.accept()
        print(f"[WS] Handshake successful: {session_id} (User: {current_user.id})")
    except Exception as e:
        print(f"[WS] Handshake failed for {session_id}: {e}")
        return
    
    headers = {"api-subscription-key": SARVAM_API_KEY}
    
    try:
        # Wait for the config message from the browser first
        data = await websocket.receive_text()
        msg = json.loads(data)
        if msg["type"] != "config":
            raise ValueError("Expected config message first")
            
        lang = msg.get("language", "en-IN")
        
        # Connect to Sarvam using URL query parameters for configuration
        sarvam_url = f"wss://api.sarvam.ai/speech-to-text/ws?language-code={lang}&model=saaras:v3"
        
        # Use extra_headers for passing headers in websockets.connect
        async with websockets.connect(sarvam_url, extra_headers=headers) as sarvam_ws:
            # ── Session State ──
            config_sent = True  # Config is already established via URL
            last_transcript = "" 

            async def receive_from_sarvam():
                """Relay transcripts from Sarvam back to Browser."""
                nonlocal last_transcript
                try:
                    async for message in sarvam_ws:
                        data = json.loads(message)
                        if "transcript" in data:
                            text = data["transcript"]
                            is_final = data.get("is_final", False)
                            
                            if is_final:
                                last_transcript = text
                                await broadcast_event("STT_DONE", "Audio transcribed", {"status": "done"})
                                
                            print(f"[Sarvam -> Browser] {text[:30]}... (final={is_final})")
                            await websocket.send_json({
                                "type": "transcript",
                                "text": text,
                                "is_final": is_final
                            })
                except Exception as e:
                    print(f"[WS] Error receiving from Sarvam: {e}")
                    raise RuntimeError(f"Sarvam connection dropped: {e}")

            async def send_to_sarvam():
                """Relay audio chunks from Browser to Sarvam."""
                nonlocal config_sent, last_transcript
                try:
                    while True:
                        data = await websocket.receive_text()
                        msg = json.loads(data)
                        
                        if msg["type"] == "audio":
                            if not config_sent: continue
                            await sarvam_ws.send(json.dumps({"audio": msg["data"]}))
                            # Optionally add a throttled ROUTING event here, but might spam. Let's just do it on flush.
                            
                        elif msg["type"] == "flush":
                            # Trigger Full Turn Logic
                            print(f"[WS] Flush received. Triggering turn logic for: '{last_transcript}'")
                            if not last_transcript or not current_user:
                                print("[WS] Skip turn: empty transcript or no user")
                                continue
                                
                            # Notify client that we are thinking
                            await websocket.send_json({"type": "status", "status": "thinking"})
                            
                            try:
                                # Call the shared turn-taking logic
                                lang = msg.get("language", "en-IN")
                                await broadcast_event("ROUTING", "Client WebSocket -> FastAPI -> AI Brain")
                                
                                # Use a fresh DB session for the turn
                                def _run_turn(text, sess, lang, usr):
                                    gen = get_db()
                                    turn_db = next(gen)
                                    try:
                                        # Since handle_voice_turn is async, we can't run it inside threadpool like this 
                                        # Wait, handle_voice_turn is an async function. We can just call it, but pass the DB.
                                        pass
                                    finally:
                                        try: next(gen) 
                                        except StopIteration: pass
                                        
                                # Wait, we need to pass a valid DB session without blocking.
                                gen = get_db()
                                turn_db = next(gen)
                                try:
                                    response_data = await handle_voice_turn(
                                        transcript=last_transcript,
                                        session_id=session_id,
                                        language=lang,
                                        current_user=current_user,
                                        db=turn_db
                                    )
                                    
                                    # Send full response back over WebSocket
                                    await websocket.send_json({
                                        "type": "response",
                                        "data": response_data
                                    })
                                    last_transcript = "" # Reset for next turn
                                finally:
                                    # We run the cleanup in thread to prevent blocking
                                    def _close_gen():
                                        try: next(gen)
                                        except StopIteration: pass
                                    await asyncio.to_thread(_close_gen)
                                
                            except Exception as e:
                                print(f"[WS] Error in handle_voice_turn: {e}")
                                traceback.print_exc()
                                await websocket.send_json({"type": "error", "message": str(e)})

                except WebSocketDisconnect:
                    print(f"[WS] Client disconnected: {session_id}")
                except Exception as e:
                    print(f"[WS] Error sending to Sarvam: {e}")
                    # Log the close code if available from the Sarvam connection object
                    try:
                        print(f"[WS] Sarvam Connection Closed: {sarvam_ws.close_code} {sarvam_ws.close_reason}")
                    except: pass

            # Task refs captured here so shutdown_monitor can cancel them
            t1: asyncio.Task | None = None
            t2: asyncio.Task | None = None

            async def shutdown_monitor():
                await websocket.app.state.shutdown_event.wait()
                print(f"[WS] Shutdown signal received for {session_id}. Force-cancelling tasks.")
                # Directly cancel the I/O tasks so asyncio.wait() unblocks immediately
                if t1 and not t1.done():
                    t1.cancel()
                if t2 and not t2.done():
                    t2.cancel()
                try:
                    await websocket.close(code=1001, reason="Server shutting down")
                except:
                    pass

            # Run all tasks concurrently
            monitor_task = asyncio.create_task(shutdown_monitor())
            t1 = asyncio.create_task(receive_from_sarvam())
            t2 = asyncio.create_task(send_to_sarvam())
            try:
                done, pending = await asyncio.wait(
                    [t1, t2, monitor_task],
                    return_when=asyncio.FIRST_COMPLETED
                )
                # Cancel all remaining tasks to release all resources
                for task in pending:
                    task.cancel()
                # Await cancellation to suppress warnings
                await asyncio.gather(*pending, return_exceptions=True)
            except asyncio.CancelledError:
                print(f"[WS] Connection for {session_id} was cancelled (Normal disconnect)")
            finally:
                if not monitor_task.done():
                    monitor_task.cancel()

    except Exception as e:
        print(f"[WS] Critical connection error to Sarvam or Client: {type(e).__name__}: {e}")
        try:
            # We only close with 1011 if the connection is still alive but we hit a server error
            if not isinstance(e, asyncio.CancelledError):
                await websocket.close(code=1011) # Internal Error
        except:
            pass
