from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from core.database.models import get_db, User, UserOnboarding, UserFeedback

router = APIRouter(prefix="/api/admin", tags=["admin"])

class AdminLoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def admin_login(req: AdminLoginRequest):
    if req.email == "admin@maitri.org" and req.password == "Maitri2026":
        return {"token": "mock_admin_token_123"}
    raise HTTPException(status_code=401, detail="Invalid admin credentials")

@router.get("/consents")
def get_consents(db: Session = Depends(get_db)):
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
def get_feedback(db: Session = Depends(get_db)):
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
