from fastapi import APIRouter, Depends, HTTPException, Response, Request as FastAPIRequest
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, EmailStr

from core.database.models import get_db, User, UserOnboarding
from security.authentication.service import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, store_refresh_token,
    verify_and_rotate_refresh_token, revoke_refresh_token_by_jti
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer = HTTPBearer()

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    preferred_language: str = Field(default="en-IN", max_length=10)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=128)

class GoogleLoginRequest(BaseModel):
    idToken: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    needs_onboarding: bool = False

def check_needs_onboarding(db: Session, user_id: int) -> bool:
    onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == user_id).first()
    if not onboarding:
        print(f"[ONBOARDING] User {user_id}: No UserOnboarding record found -> needs_onboarding=True")
        return True
    needs = not onboarding.is_completed
    print(f"[ONBOARDING] User {user_id}: onboarding.is_completed={onboarding.is_completed} -> needs_onboarding={needs}")
    return needs

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db)
) -> User:
    payload = decode_token(credentials.credentials, expected_type="access")
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == payload.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="You are not allowed to access right now")
    return user

def set_refresh_cookie(response: Response, refresh_token: str):
    import os
    samesite = os.getenv("COOKIE_SAMESITE", "lax").lower()
    if samesite not in ("strict", "lax", "none"):
        samesite = "lax"
    is_prod = os.getenv("ENVIRONMENT", "").lower() in ("production", "prod")
    # If samesite=none, browsers strictly require secure=True
    is_secure = True if (samesite == "none" or is_prod) else True
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_secure,
        samesite=samesite,
        max_age=7 * 24 * 60 * 60
    )


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    from providers.firebase.firebase_rest import firebase_client
    await firebase_client.register(req.email, req.password)

    user = User(
        username=req.username, email=req.email,
        hashed_password="firebase_managed",
        preferred_language=req.preferred_language,
        is_active=True
    )
    db.add(user); db.commit(); db.refresh(user)

    token = create_access_token({"user_id": user.id, "username": user.username})
    refresh_str, refresh_jti, refresh_family = create_refresh_token({"user_id": user.id, "username": user.username})
    store_refresh_token(db, user.id, refresh_jti, refresh_family)
    set_refresh_cookie(response, refresh_str)

    needs_onboarding = check_needs_onboarding(db, user.id)
    return TokenResponse(access_token=token, username=user.username, needs_onboarding=needs_onboarding)

@router.post("/login", response_model=TokenResponse)
async def login(request: FastAPIRequest, req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    from providers.firebase.firebase_rest import firebase_client
    from security.sentinel import sentinel
    from core.middleware.security import _get_real_ip
    client_ip = _get_real_ip(request)

    try:
        await firebase_client.login(req.email, req.password)
    except Exception as e:
        sentinel.record_event(client_ip, "LOGIN_FAILED", req.email)
        raise e

    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        sentinel.record_event(client_ip, "LOGIN_FAILED", req.email)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="You are not allowed to access right now")

    token = create_access_token({"user_id": user.id, "username": user.username})
    refresh_str, refresh_jti, refresh_family = create_refresh_token({"user_id": user.id, "username": user.username})
    store_refresh_token(db, user.id, refresh_jti, refresh_family)
    set_refresh_cookie(response, refresh_str)

    needs_onboarding = check_needs_onboarding(db, user.id)
    return TokenResponse(access_token=token, username=user.username, needs_onboarding=needs_onboarding)

@router.post("/google", response_model=TokenResponse)
async def google_login(req: GoogleLoginRequest, response: Response, db: Session = Depends(get_db)):
    from providers.firebase.firebase_rest import FIREBASE_API_KEY
    import httpx
    
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={FIREBASE_API_KEY}"
    payload = {"idToken": req.idToken}
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload)
        data = resp.json()
        
        if not resp.is_success or "users" not in data or len(data["users"]) == 0:
            raise HTTPException(status_code=401, detail="Invalid Google token")
            
        google_user = data["users"][0]
        email = google_user.get("email")
        display_name = google_user.get("displayName", "User")
        
        if not email:
            raise HTTPException(status_code=400, detail="Google account has no email")
            
        user = db.query(User).filter(User.email == email).first()
        
        if user and not user.is_active:
            raise HTTPException(status_code=403, detail="You are not allowed to access right now")
        
        if not user:
            base_username = display_name.replace(" ", "").lower()
            if not base_username:
                base_username = email.split("@")[0]
            
            username = base_username
            counter = 1
            while db.query(User).filter(User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1
                
            user = User(
                username=username,
                email=email,
                hashed_password="firebase_google_managed",
                preferred_language="en-IN",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        token = create_access_token({"user_id": user.id, "username": user.username})
        refresh_str, refresh_jti, refresh_family = create_refresh_token({"user_id": user.id, "username": user.username})
        store_refresh_token(db, user.id, refresh_jti, refresh_family)
        set_refresh_cookie(response, refresh_str)

        needs_onboarding = check_needs_onboarding(db, user.id)
        return TokenResponse(access_token=token, username=user.username, needs_onboarding=needs_onboarding)

@router.post("/refresh", response_model=TokenResponse)
def refresh_access_token(request: FastAPIRequest, response: Response, db: Session = Depends(get_db)):
    """
    CRIT-02: Refresh token rotation.
    - Validates the incoming JTI against the DB store
    - Detects reuse (stolen token) and revokes the entire family
    - Issues a new access + refresh token pair
    - Old refresh JTI is marked 'rotated' (consumed)
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    payload, family = verify_and_rotate_refresh_token(db, refresh_token)
    if not payload or not family:
        from security.sentinel import sentinel
        from core.middleware.security import _get_real_ip
        sentinel.record_event(_get_real_ip(request), "TOKEN_REUSE_DETECTED", "Refresh token invalid/replayed")
        # Clear the cookie on any failure — forces re-login
        response.delete_cookie("refresh_token")
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token. Please log in again.")

    user = db.query(User).filter(User.id == payload.get("user_id")).first()
    if not user or not user.is_active:
        response.delete_cookie("refresh_token")
        raise HTTPException(status_code=401, detail="Session invalid. Please log in again.")

    # Issue new token pair
    new_access = create_access_token({"user_id": user.id, "username": user.username})
    new_refresh_str, new_jti, _ = create_refresh_token(
        {"user_id": user.id, "username": user.username},
        family=family  # keep same family chain
    )
    store_refresh_token(db, user.id, new_jti, family)
    set_refresh_cookie(response, new_refresh_str)

    return TokenResponse(access_token=new_access, username=user.username)

@router.post("/logout")
def logout(request: FastAPIRequest, response: Response, db: Session = Depends(get_db)):
    """
    MED-08: Server-side token revocation on logout.
    Decodes the refresh token cookie and revokes its JTI in the DB,
    so stolen refresh tokens cannot be replayed after the user logs out.
    """
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        payload = decode_token(refresh_token, expected_type="refresh")
        if payload and payload.get("jti"):
            revoke_refresh_token_by_jti(db, payload["jti"], reason="logout")
    response.delete_cookie("refresh_token")
    return {"status": "success", "message": "Logged out successfully"}


# ---------------------------------------------------------------------------
# WebSocket Ticket (CRIT-04 — replaces token-in-URL)
# ---------------------------------------------------------------------------
import time
from typing import Dict

# Process-local ticket store: {ticket_uuid: (user_id, expires_at)}
# Phase 4 will migrate this to Redis for multi-worker support
_WS_TICKETS: Dict[str, tuple[int, float]] = {}
WS_TICKET_TTL = 30  # seconds — short-lived, single-use

def _prune_ws_tickets(now: float) -> None:
    """CWE-770: Bound ticket memory usage."""
    if len(_WS_TICKETS) > 1000:
        expired = [k for k, (_, exp) in _WS_TICKETS.items() if now > exp]
        for k in expired:
            _WS_TICKETS.pop(k, None)
        if len(_WS_TICKETS) > 1000:
            for k in list(_WS_TICKETS.keys())[:200]:
                _WS_TICKETS.pop(k, None)

@router.post("/ws-ticket")
def issue_ws_ticket(current_user: User = Depends(get_current_user)):
    """
    CRIT-04: Issues a short-lived (30s), single-use WebSocket ticket.
    The client exchanges this ticket for a WebSocket connection instead
    of passing the JWT in a URL query string.
    """
    now = time.time()
    _prune_ws_tickets(now)

    ticket = str(uuid.uuid4())
    _WS_TICKETS[ticket] = (current_user.id, now + WS_TICKET_TTL)
    return {"ticket": ticket, "expires_in": WS_TICKET_TTL}


def consume_ws_ticket(ticket: str) -> int | None:
    """
    Validates and consumes (single-use) a WebSocket ticket.
    Returns user_id on success, None on failure.
    Called by the WebSocket endpoint.
    """
    import uuid as _uuid
    try:
        _uuid.UUID(ticket)  # validate format
    except ValueError:
        return None

    entry = _WS_TICKETS.pop(ticket, None)  # atomic pop = single-use
    if not entry:
        return None
    user_id, expires_at = entry
    if time.time() > expires_at:
        return None
    return user_id


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id, 
        "username": current_user.username, 
        "email": current_user.email, 
        "preferred_language": current_user.preferred_language,
        "is_active": current_user.is_active
    }

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    from providers.firebase.firebase_rest import firebase_client
    # Verify user exists in local DB or silently succeed for privacy
    user = db.query(User).filter(User.email == req.email).first()
    if user:
        try:
            await firebase_client.send_password_reset(req.email)
        except Exception as e:
            print(f"[AUTH] Firebase password reset notice: {e}")
            
    return {
        "status": "success",
        "message": "If this email is registered with us, a password reset link has been sent to your inbox."
    }

