from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from core.database.models import get_db, User, UserOnboarding, UserPersonaProfile, func
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
    consent: Optional[Dict[str, Any]] = None

@router.post("/onboarding")
def save_onboarding(
    data: OnboardingData,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print(f"[ONBOARDING] Saving onboarding for User ID={current_user.id} ({current_user.username})...")
    try:
        # 1. Update or create UserOnboarding record
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
        onboarding.raw_responses = data.model_dump()
        onboarding.is_completed = True
        onboarding.completed_at = func.now()

        # 2. Atomically sync UserPersonaProfile
        persona = db.query(UserPersonaProfile).filter(UserPersonaProfile.user_id == current_user.id).first()
        if not persona:
            persona = UserPersonaProfile(
                user_id=current_user.id,
                onboarding_complete=True,
                initial_presenting_topic=data.primary_goal or (data.reasons[0] if data.reasons else "onboarding"),
                communication_style=data.conversation_style or "balanced"
            )
            db.add(persona)
        else:
            persona.onboarding_complete = True
            if data.primary_goal:
                persona.initial_presenting_topic = data.primary_goal

        # 3. Commit transaction
        db.commit()
        print(f"[ONBOARDING] Transaction commit successful for User {current_user.id}: is_completed=True, persona.onboarding_complete=True")
        return {"status": "success", "message": "Onboarding data saved successfully"}
    except Exception as e:
        db.rollback()
        print(f"[ONBOARDING_ERROR] Transaction commit failed for User {current_user.id}, rolled back: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save onboarding data: {str(e)}")

@router.get("/onboarding/status")
def get_onboarding_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    completed = onboarding.is_completed if (onboarding and onboarding.is_completed is not None) else False
    print(f"[ONBOARDING] GET /api/user/onboarding/status for User {current_user.id}: completed={completed}")
    return {
        "completed": completed
    }
