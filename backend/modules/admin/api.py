import os
import uuid
from datetime import datetime, timedelta, timezone
import csv
from io import StringIO
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from core.database.models import get_db, User, UserOnboarding, UserFeedback, UserProfile, Session as DBSession, Message, MessageEmotion
from security.authentication.service import SECRET_KEY, ALGORITHM, ISSUER, AUDIENCE

def _sanitize_csv_cell(value):
    """CWE-1236: Neutralize formula injection in CSV exports."""
    if isinstance(value, str) and value:
        if value[0] in ('=', '+', '-', '@', '\t', '\r', '|', '%'):
            return f"'{value}"
    return value

router = APIRouter(prefix="/api/admin", tags=["admin"])
admin_bearer = HTTPBearer()

_REVOKED_ADMIN_JTIS: set = set()

def require_admin(credentials: HTTPAuthorizationCredentials = Depends(admin_bearer)):
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            issuer=ISSUER,
            audience=AUDIENCE
        )
        if payload.get("type") != "admin_access" or payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
        jti = payload.get("jti")
        if jti and jti in _REVOKED_ADMIN_JTIS:
            raise HTTPException(status_code=403, detail="Admin session revoked")
        return payload
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=403, detail="Invalid admin token")

@router.post("/logout")
def admin_logout(admin=Depends(require_admin)):
    jti = admin.get("jti")
    if jti:
        _REVOKED_ADMIN_JTIS.add(jti)
    return {"status": "success", "message": "Admin session terminated"}

import secrets

class AdminLoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def admin_login(request: Request, req: AdminLoginRequest):
    admin_email = os.getenv("ADMIN_EMAIL")   # No default — must be explicitly configured
    admin_pass  = os.getenv("ADMIN_PASSWORD")

    # Both must be explicitly set; never fall back to a predictable default
    if not admin_email or not admin_pass:
        raise HTTPException(status_code=403, detail="Not authorized")

    if secrets.compare_digest(req.email, admin_email) and secrets.compare_digest(req.password, admin_pass):
        now = datetime.now(timezone.utc)
        # HIGH-02: Constrain admin token lifetime to 2 hours (was 12 hours)
        payload = {
            "role": "admin",
            "email": req.email,
            "exp": now + timedelta(hours=2),
            "iat": now,
            "nbf": now,
            "iss": ISSUER,
            "aud": AUDIENCE,
            "jti": str(uuid.uuid4()),
            "type": "admin_access"
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        return {"token": token}

    from security.sentinel import sentinel
    from core.middleware.security import _get_real_ip
    client_ip = _get_real_ip(request)
    sentinel.record_event(client_ip, "ADMIN_LOGIN_FAILED", req.email)
    raise HTTPException(status_code=401, detail="Invalid admin credentials")

@router.get("/consents")
def get_consents(admin=Depends(require_admin), db: Session = Depends(get_db)):
    results = db.query(UserOnboarding, User).join(User, UserOnboarding.user_id == User.id).all()
    consents = []
    for onboarding, user in results:
        consents.append({
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "completed_at": onboarding.completed_at,
            "raw_responses": onboarding.raw_responses,
        })
    return {"consents": consents}

@router.get("/feedback")
def get_feedback(admin=Depends(require_admin), db: Session = Depends(get_db)):
    results = db.query(UserFeedback, User).join(User, UserFeedback.user_id == User.id).all()
    feedbacks = []
    for feedback, user in results:
        feedbacks.append({
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "content": feedback.content,
            "created_at": feedback.created_at,
        })
    return {"feedbacks": feedbacks}

@router.get("/users")
def get_users(admin=Depends(require_admin), db: Session = Depends(get_db), search: str = "", skip: int = 0, limit: int = 50):
    # MED-07: Cap maximum page size to prevent full-table dump
    limit = min(limit, 100)
    base_query = db.query(User)
    if search:
        search_term = f"%{search}%"
        base_query = base_query.filter((User.username.ilike(search_term)) | (User.email.ilike(search_term)))
    total = base_query.count()

    query = db.query(
        User, 
        func.count(DBSession.id).label('session_count'),
        func.max(DBSession.updated_at).label('last_active')
    ).outerjoin(DBSession, User.id == DBSession.user_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter((User.username.ilike(search_term)) | (User.email.ilike(search_term)))
        
    query = query.group_by(User.id).order_by(User.created_at.desc()).offset(skip).limit(limit)
    
    users = []
    for user, session_count, last_active in query.all():
        users.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "preferred_language": user.preferred_language,
            "created_at": user.created_at,
            "is_active": user.is_active,
            "session_count": session_count,
            "last_active": last_active or user.updated_at
        })
    return {"users": users, "total": total}

@router.get("/users/{user_id}")
def get_user_detail(user_id: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    session_count = db.query(func.count(DBSession.id)).filter(DBSession.user_id == user_id).scalar()
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "preferred_language": user.preferred_language,
        "created_at": user.created_at,
        "is_active": user.is_active,
        "profile": {
            "bio": profile.bio if profile else None,
            "age": profile.age if profile else None,
            "preferred_name": profile.preferred_name if profile else None,
            "full_name": profile.full_name if profile else None,
            "profession": profile.profession if profile else None,
            "therapy_focus": profile.therapy_focus if profile else None,
        } if profile else None,
        "activity_summary": {
            "total_sessions": session_count,
            "last_activity": user.updated_at
        }
    }

@router.get("/users/{user_id}/sessions")
def get_user_sessions(user_id: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    sessions = db.query(DBSession).filter(DBSession.user_id == user_id).order_by(DBSession.started_at.desc()).all()
    results = []
    for sess in sessions:
        msg_count = db.query(func.count(Message.id)).filter(Message.session_id == sess.id).scalar()
        results.append({
            "id": sess.id,
            "session_token": sess.session_token,
            "started_at": sess.started_at,
            "ended_at": sess.ended_at,
            "channel": sess.channel,
            "is_crisis_flagged": sess.is_crisis_flagged,
            "message_count": msg_count
        })
    return {"sessions": results}

@router.get("/sessions/{session_id}")
def get_session_messages(session_id: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    from core.logger.terminal import CommandCenter
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    messages = db.query(Message).filter(Message.session_id == session_id).order_by(Message.created_at.asc()).all()
    results = []
    for msg in messages:
        results.append({
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at,
            "emotion": msg.emotion.emotion_label if msg.emotion else None
        })
        
    admin_email = admin.get("email", "admin")
    CommandCenter.log_db("ADMIN", f"Admin {admin_email} viewed session {session_id}")
    return {"messages": results, "session": {"started_at": session.started_at, "channel": session.channel}}

@router.get("/users/{user_id}/export")
def export_user_data(user_id: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    from core.logger.terminal import CommandCenter
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    output = StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    def write_row_sanitized(row):
        writer.writerow([_sanitize_csv_cell(c) for c in row])
    
    write_row_sanitized([
        "user_id", "username", "email", "preferred_language", "created_at",
        "session_id", "session_crisis_flagged", "session_risk_level",
        "session_started_at", "session_ended_at",
        "message_id", "sender", "timestamp",
        "message_risk_level", "message_risk_score", "is_crisis_message",
        "message"
    ])
    
    sessions = db.query(DBSession).filter(DBSession.user_id == user_id).order_by(DBSession.started_at.asc()).all()
    
    for sess in sessions:
        session_crisis_str = "Yes" if sess.is_crisis_flagged else "No"
        session_risk_lvl = sess.risk_level or "low"
        messages = db.query(Message).filter(Message.session_id == sess.id).order_by(Message.created_at.asc()).all()
        if not messages:
            write_row_sanitized([
                user.id, user.username, user.email, user.preferred_language, user.created_at.isoformat() if user.created_at else "",
                sess.id, session_crisis_str, session_risk_lvl,
                sess.started_at.isoformat() if sess.started_at else "", sess.ended_at.isoformat() if sess.ended_at else "",
                "", "", "", "", "", "", ""
            ])
        else:
            for msg in messages:
                is_user = (msg.role == "user")
                is_crisis_msg = "Yes" if (is_user and msg.is_crisis_flagged) else "No"
                if is_user:
                    msg_risk_level = msg.analysis.risk_level if (msg.analysis and msg.analysis.risk_level) else ("CRITICAL" if msg.is_crisis_flagged else "Low")
                    msg_risk_score = msg.analysis.risk_score if (msg.analysis and msg.analysis.risk_score is not None) else (1.0 if msg.is_crisis_flagged else 0.0)
                else:
                    msg_risk_level = ""
                    msg_risk_score = ""
                write_row_sanitized([
                    user.id, user.username, user.email, user.preferred_language, user.created_at.isoformat() if user.created_at else "",
                    sess.id, session_crisis_str, session_risk_lvl,
                    sess.started_at.isoformat() if sess.started_at else "", sess.ended_at.isoformat() if sess.ended_at else "",
                    msg.id, msg.role, msg.created_at.isoformat() if msg.created_at else "",
                    msg_risk_level, msg_risk_score, is_crisis_msg,
                    msg.content
                ])
                
    response = Response(content=output.getvalue(), media_type="text/csv")
    date_str = datetime.now().strftime("%Y%m%d")
    response.headers["Content-Disposition"] = f"attachment; filename=mythri_user_{user_id}_{date_str}.csv"
    
    admin_email = admin.get("email", "admin")
    CommandCenter.log_db("ADMIN", f"Admin {admin_email} exported CSV for user {user_id}")
    return response

@router.get("/sessions/{session_id}/export")
def export_session_data(session_id: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    """Export a specific single session and all its messages to CSV."""
    from core.logger.terminal import CommandCenter
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    user = db.query(User).filter(User.id == session.user_id).first()
    
    output = StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    def write_row_sanitized(row):
        writer.writerow([_sanitize_csv_cell(c) for c in row])
    
    write_row_sanitized([
        "session_id", "session_token", "user_id", "username", "email",
        "channel", "session_crisis_flagged", "session_risk_level", "session_risk_score",
        "session_started_at", "session_ended_at",
        "message_id", "sender", "timestamp",
        "message_risk_level", "message_risk_score", "is_crisis_message",
        "emotion", "message"
    ])
    
    messages = db.query(Message).filter(Message.session_id == session.id).order_by(Message.created_at.asc()).all()
    
    username = user.username if user else "Unknown"
    email = user.email if user else ""
    user_id = user.id if user else session.user_id
    session_crisis_str = "Yes" if session.is_crisis_flagged else "No"
    session_risk_lvl = session.risk_level or "low"
    session_risk_scr = session.risk_score if session.risk_score is not None else 0.0
    
    if not messages:
        write_row_sanitized([
            session.id, session.session_token, user_id, username, email,
            session.channel, session_crisis_str, session_risk_lvl, session_risk_scr,
            session.started_at.isoformat() if session.started_at else "",
            session.ended_at.isoformat() if session.ended_at else "",
            "", "", "", "", "", "", "", ""
        ])
    else:
        for msg in messages:
            emotion_lbl = msg.emotion.emotion_label if msg.emotion else ""
            is_user = (msg.role == "user")
            is_crisis_msg = "Yes" if (is_user and msg.is_crisis_flagged) else "No"
            
            if is_user:
                if msg.analysis and msg.analysis.risk_level:
                    msg_risk_level = msg.analysis.risk_level
                else:
                    msg_risk_level = "CRITICAL" if msg.is_crisis_flagged else "Low"
                    
                if msg.analysis and msg.analysis.risk_score is not None:
                    msg_risk_score = msg.analysis.risk_score
                else:
                    msg_risk_score = 1.0 if msg.is_crisis_flagged else 0.0
            else:
                msg_risk_level = ""
                msg_risk_score = ""
                
            write_row_sanitized([
                session.id, session.session_token, user_id, username, email,
                session.channel, session_crisis_str, session_risk_lvl, session_risk_scr,
                session.started_at.isoformat() if session.started_at else "",
                session.ended_at.isoformat() if session.ended_at else "",
                msg.id, msg.role, msg.created_at.isoformat() if msg.created_at else "",
                msg_risk_level, msg_risk_score, is_crisis_msg,
                emotion_lbl, msg.content
            ])
            
    response = Response(content=output.getvalue(), media_type="text/csv")
    date_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    response.headers["Content-Disposition"] = f"attachment; filename=mythri_session_{session_id}_{date_str}.csv"
    
    admin_email = admin.get("email", "admin")
    CommandCenter.log_db("ADMIN", f"Admin {admin_email} exported CSV for session {session_id}")
    return response


class BulkDeleteRequest(BaseModel):
    user_ids: list[int] = Field(..., min_length=1, max_length=100)

@router.post("/users/bulk-delete")
async def bulk_delete_users(req: BulkDeleteRequest, admin=Depends(require_admin), db: Session = Depends(get_db)):
    """Delete multiple users from the database and Firebase Auth."""
    from core.logger.terminal import CommandCenter

    admin_email = admin.get("email", "admin")

    if not req.user_ids:
        raise HTTPException(status_code=400, detail="No user IDs provided")

    deleted = []
    errors = []

    # Check if Firebase Admin SDK is initialized
    firebase_admin_available = False
    try:
        import firebase_admin
        import firebase_admin.auth as fb_auth
        firebase_admin_available = bool(firebase_admin._apps)
    except ImportError:
        pass

    for uid in req.user_ids:
        user = db.query(User).filter(User.id == uid).first()
        if not user:
            errors.append({"id": uid, "error": "User not found"})
            continue

        user_email = user.email
        firebase_note = "skipped (Admin SDK not initialized)"

        # 1. Delete from Firebase Auth (best-effort via Admin SDK)
        if firebase_admin_available:
            try:
                fb_user = fb_auth.get_user_by_email(user_email)
                fb_auth.delete_user(fb_user.uid)
                firebase_note = "deleted from Firebase"
                CommandCenter.log_db("ADMIN", f"Firebase user {fb_user.uid} ({user_email}) deleted")
            except fb_auth.UserNotFoundError:
                firebase_note = "not found in Firebase"
            except Exception as fb_err:
                firebase_note = f"Firebase error: {str(fb_err)}"
                CommandCenter.log_db("ADMIN", f"Firebase delete failed for {user_email}: {fb_err}")

        # 2. Delete from DB — cascade removes sessions, messages, profile, memory, etc.
        try:
            db.delete(user)
            db.commit()
            deleted.append({"id": uid, "email": user_email, "firebase": firebase_note})
            CommandCenter.log_db("ADMIN", f"Admin {admin_email} deleted user {uid} ({user_email}) from DB")
        except Exception as db_err:
            db.rollback()
            errors.append({"id": uid, "error": str(db_err)})

    return {
        "deleted": deleted,
        "errors": errors,
        "message": f"Deleted {len(deleted)} user(s). {len(errors)} error(s)."
    }


class UserStatusRequest(BaseModel):
    is_active: bool

@router.put("/users/{user_id}/status")
def update_user_status(user_id: int, req: UserStatusRequest, admin=Depends(require_admin), db: Session = Depends(get_db)):
    """Block or unblock a user."""
    from core.logger.terminal import CommandCenter
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = req.is_active
    db.commit()
    db.refresh(user)
    
    admin_email = admin.get("email", "admin")
    action_str = "unblocked" if req.is_active else "blocked"
    CommandCenter.log_db("ADMIN", f"Admin {admin_email} {action_str} user {user_id} ({user.email})")
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_active": user.is_active,
        "message": f"User successfully {action_str}"
    }


class BulkStatusRequest(BaseModel):
    user_ids: list[int] = Field(..., min_length=1, max_length=100)
    is_active: bool

@router.post("/users/bulk-status")
def bulk_update_user_status(req: BulkStatusRequest, admin=Depends(require_admin), db: Session = Depends(get_db)):
    """Bulk block or unblock multiple users."""
    from core.logger.terminal import CommandCenter
    if not req.user_ids:
        raise HTTPException(status_code=400, detail="No user IDs provided")
    
    users = db.query(User).filter(User.id.in_(req.user_ids)).all()
    for user in users:
        user.is_active = req.is_active
    db.commit()
    
    admin_email = admin.get("email", "admin")
    action_str = "unblocked" if req.is_active else "blocked"
    CommandCenter.log_db("ADMIN", f"Admin {admin_email} bulk {action_str} {len(users)} user(s)")
    
    return {
        "updated_count": len(users),
        "is_active": req.is_active,
        "message": f"Successfully {action_str} {len(users)} user(s)"
    }


class AllUsersStatusRequest(BaseModel):
    is_active: bool
    confirmation_phrase: str

@router.post("/users/all-status")
def update_all_users_status(req: AllUsersStatusRequest, admin=Depends(require_admin), db: Session = Depends(get_db)):
    """
    HIGH-03: Block or unblock ALL users in the system.
    Requires explicit confirmation_phrase to prevent catastrophic accidental or automated lockouts.
    """
    expected_phrase = "CONFIRM_UNBLOCK_ALL_USERS" if req.is_active else "CONFIRM_BLOCK_ALL_USERS"
    if req.confirmation_phrase != expected_phrase:
        raise HTTPException(
            status_code=400,
            detail=f"Safety check failed. To modify all users at once, confirmation_phrase must be '{expected_phrase}'."
        )

    from core.logger.terminal import CommandCenter
    updated_count = db.query(User).update({User.is_active: req.is_active})
    db.commit()
    
    admin_email = admin.get("email", "admin")
    action_str = "unblocked" if req.is_active else "blocked"
    CommandCenter.log_db("ADMIN", f"Admin {admin_email} {action_str} ALL {updated_count} users")
    
    return {
        "updated_count": updated_count,
        "is_active": req.is_active,
        "message": f"Successfully {action_str} all {updated_count} users"
    }


# ── Threat Sentinel Security Telemetry Endpoints ────────────────────────────

@router.get("/security/threat-summary")
def get_threat_summary(admin=Depends(require_admin)):
    """Provides real-time visibility into active IP quarantines and elevated risk hosts."""
    from security.sentinel import sentinel
    return sentinel.get_threat_summary()


class UnbanRequest(BaseModel):
    ip: str

@router.post("/security/unban")
def unban_host(req: UnbanRequest, admin=Depends(require_admin)):
    """Allows administrators to manually lift an automated IP quarantine."""
    from security.sentinel import sentinel
    unbanned = sentinel.manual_unban(req.ip)
    return {"status": "success", "unbanned": unbanned, "ip": req.ip}
