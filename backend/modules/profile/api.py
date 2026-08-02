from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from core.database.models import get_db, User, UserOnboarding
from security.authentication.api import get_current_user

router = APIRouter(prefix="/api/user", tags=["user"])

class OnboardingData(BaseModel):
    preferred_name: Optional[str] = None
    language: Optional[str] = None
    conversation_style: Optional[str] = None
    communication_mode: Optional[str] = None
    initial_emotion: Optional[str] = None
    primary_goal: Optional[str] = None
    check_in_preference: Optional[str] = None
    goals: List[str] = []
    reasons: List[str] = []

@router.post("/onboarding")
def save_onboarding(
    data: OnboardingData,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if exists
    onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    
    if not onboarding:
        onboarding = UserOnboarding(user_id=current_user.id)
        db.add(onboarding)
        
    onboarding.preferred_name = data.preferred_name
    onboarding.language = data.language
    onboarding.conversation_style = data.conversation_style
    onboarding.communication_mode = data.communication_mode
    onboarding.initial_emotion = data.initial_emotion
    onboarding.primary_goal = data.primary_goal
    onboarding.check_in_preference = data.check_in_preference
    onboarding.goals = data.goals
    onboarding.reasons = data.reasons
    
    db.commit()
    
    return {"status": "success", "message": "Onboarding data saved successfully"}

@router.get("/onboarding/status")
def get_onboarding_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    return {
        "completed": onboarding is not None
    }
