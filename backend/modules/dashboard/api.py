import asyncio
import json
import os
import jwt
from fastapi import APIRouter, Request, Query, HTTPException, status
from sse_starlette.sse import EventSourceResponse

from security.authentication.service import SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])

# A global list of asyncio Queues for connected SSE clients
_clients = []

SENSITIVE_KEYS = {"text", "transcript", "message", "audio", "audio_b64", "password", "token", "email", "content", "raw_responses"}

def _sanitize_data(data: dict) -> dict:
    if not isinstance(data, dict):
        return {}
    sanitized = {}
    for k, v in data.items():
        k_lower = str(k).lower()
        if any(sk in k_lower for sk in SENSITIVE_KEYS):
            if isinstance(v, str):
                sanitized[f"{k}_length"] = len(v)
            else:
                sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = _sanitize_data(v)
        else:
            sanitized[k] = v
    return sanitized

async def broadcast_event(event_type: str, message: str = "", data: dict = None):
    """
    Broadcasts a sanitized telemetry event to all connected SSE clients (e.g. HTML visualizer).
    Omits raw text/transcripts to prevent data leakage.
    """
    sanitized_data = _sanitize_data(data) if data else {}
    payload = {
        "event_type": event_type,
        "message": message,
        "data": sanitized_data
    }
    
    # We serialize it to JSON for the SSE data payload
    event_payload = json.dumps(payload)
    
    for queue in _clients:
        try:
            await queue.put({"data": event_payload})
        except Exception as e:
            print(f"[TELEMETRY] Error putting event in queue: {e}")

def _verify_telemetry_access(request: Request, token: str = None):
    """
    Validate that telemetry stream request comes from an authenticated user or admin.
    """
    raw_token = token
    if not raw_token:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            raw_token = auth_header.split(" ", 1)[1]
            
    # In local development without strict auth configured, allow localhost if explicitly specified
    allow_unauth_dev = os.getenv("ALLOW_DEV_TELEMETRY", "false").lower() == "true"
    client_host = request.client.host if request.client else ""
    if allow_unauth_dev and client_host in ("127.0.0.1", "::1", "localhost"):
        return {"role": "dev_local"}
        
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access telemetry stream"
        )
        
    try:
        payload = jwt.decode(
            raw_token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"verify_aud": False, "verify_iss": False}
        )
        if payload.get("role") == "admin" or payload.get("type") in ("admin_access", "access"):
            return payload
    except Exception:
        pass
        
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid or unauthorized telemetry access token"
    )

@router.get("/stream")
async def stream(request: Request, token: str = Query(None)):
    """
    SSE Endpoint for real-time visualization.
    Protected with token authentication.
    """
    _verify_telemetry_access(request, token)
    
    q = asyncio.Queue()
    _clients.append(q)
    print(f"[TELEMETRY] New authorized client connected. Total clients: {len(_clients)}")
    
    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                if request.app.state.shutdown_event.is_set():
                    break
                # Race the queue.get against the shutdown event so we exit instantly
                get_task = asyncio.ensure_future(q.get())
                shutdown_task = asyncio.ensure_future(
                    request.app.state.shutdown_event.wait()
                )
                done, pending = await asyncio.wait(
                    [get_task, shutdown_task],
                    return_when=asyncio.FIRST_COMPLETED
                )
                for p in pending:
                    p.cancel()
                if shutdown_task in done:
                    break
                if get_task in done:
                    try:
                        yield get_task.result()
                    except Exception:
                        break
        except asyncio.CancelledError:
            pass
        finally:
            print("[TELEMETRY] Client disconnected.")
            if q in _clients:
                _clients.remove(q)
                
    return EventSourceResponse(event_generator())
