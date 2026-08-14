import os
import uuid
from datetime import datetime, timedelta, timezone
import csv
from io import StringIO
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from core.database.models import get_db, User, UserOnboarding, UserFeedback, UserProfile, Session as DBSession, Message, MessageEmotion
from security.authentication.service import SECRET_KEY, ALGORITHM, ISSUER, AUDIENCE

router = APIRouter(prefix="/api/admin", tags=["admin"])
admin_bearer = HTTPBearer()

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
        return payload
    except Exception:
        raise HTTPException(status_code=403, detail="Invalid admin token")

class AdminLoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def admin_login(req: AdminLoginRequest):
    admin_email = os.getenv("ADMIN_EMAIL", "admin@maitri.org")
    admin_pass = os.getenv("ADMIN_PASSWORD", "Maitri2026")
    
    if req.email == admin_email and req.password == admin_pass:
        now = datetime.now(timezone.utc)
        payload = {
            "role": "admin",
            "email": req.email,
            "exp": now + timedelta(hours=12),
            "iat": now,
            "nbf": now,
            "iss": ISSUER,
            "aud": AUDIENCE,
            "jti": str(uuid.uuid4()),
            "type": "admin_access"
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        return {"token": token}
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
    return {"users": users}

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
    
    writer.writerow([
        "user_id", "username", "email", "preferred_language", "created_at",
        "session_id", "session_started_at", "session_ended_at",
        "message_id", "sender", "timestamp", "message"
    ])
    
    sessions = db.query(DBSession).filter(DBSession.user_id == user_id).order_by(DBSession.started_at.asc()).all()
    
    for sess in sessions:
        messages = db.query(Message).filter(Message.session_id == sess.id).order_by(Message.created_at.asc()).all()
        if not messages:
            writer.writerow([
                user.id, user.username, user.email, user.preferred_language, user.created_at.isoformat() if user.created_at else "",
                sess.id, sess.started_at.isoformat() if sess.started_at else "", sess.ended_at.isoformat() if sess.ended_at else "",
                "", "", "", ""
            ])
        else:
            for msg in messages:
                writer.writerow([
                    user.id, user.username, user.email, user.preferred_language, user.created_at.isoformat() if user.created_at else "",
                    sess.id, sess.started_at.isoformat() if sess.started_at else "", sess.ended_at.isoformat() if sess.ended_at else "",
                    msg.id, msg.role, msg.created_at.isoformat() if msg.created_at else "", msg.content
                ])
                
    response = Response(content=output.getvalue(), media_type="text/csv")
    date_str = datetime.now().strftime("%Y%m%d")
    response.headers["Content-Disposition"] = f"attachment; filename=mythri_user_{user_id}_{date_str}.csv"
    
    admin_email = admin.get("email", "admin")
    CommandCenter.log_db("ADMIN", f"Admin {admin_email} exported CSV for user {user_id}")
    return response


