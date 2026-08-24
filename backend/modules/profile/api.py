from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from core.database.models import get_db, User, UserOnboarding, UserPersonaProfile, UserProfile, func
from security.authentication.api import get_current_user
from .schemas import ProfileResponse, ProfileUpdate

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
        
        # Generate detailed summary
        summary = (
            f"User prefers to be called {data.preferred_name or current_user.username}. "
            f"They communicate primarily in {data.language or 'English'}. "
            f"Their preferred conversation style is {data.conversation_style or 'balanced'}, "
            f"and their mode of communication is {data.communication_mode or 'mixed'}. "
        )
        if data.initial_emotion:
            summary += f"They arrived feeling {data.initial_emotion}. "
        if data.primary_goal:
            summary += f"Their primary goal is: {data.primary_goal}. "
        if data.goals:
            summary += f"Additional goals: {', '.join(data.goals)}. "
        if data.reasons:
            summary += f"Reasons for seeking help: {', '.join(data.reasons)}. "
        
        onboarding.summary = summary
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

@router.get("/profile", response_model=ProfileResponse)
def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    
    # Calculate setup percentage (e.g. out of 4 core fields)
    core_fields = [
        profile.full_name if profile else None,
        profile.age if profile else None,
        profile.profession if profile else None,
        profile.preferred_name if profile else (onboarding.preferred_name if onboarding else None)
    ]
    completed_fields = sum(1 for f in core_fields if f)
    setup_percentage = int((completed_fields / len(core_fields)) * 100) if len(core_fields) > 0 else 0

    return ProfileResponse(
        username=current_user.username,
        email=current_user.email,
        full_name=profile.full_name if profile else None,
        preferred_name=profile.preferred_name if profile else (onboarding.preferred_name if onboarding else None),
        age=profile.age if profile else None,
        profession=profile.profession if profile else None,
        preferred_language=current_user.preferred_language or "en-IN",
        is_email_verified=True, # Stub
        member_since=current_user.created_at,
        setup_percentage=setup_percentage,
        onboarding_summary=onboarding.summary if onboarding else None,
        onboarding_goals=onboarding.goals if onboarding else [],
        onboarding_reasons=onboarding.reasons if onboarding else [],
        conversation_style=onboarding.conversation_style if onboarding else None
    )

@router.put("/profile", response_model=ProfileResponse)
def update_user_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Update User level fields
        if data.preferred_language is not None:
            current_user.preferred_language = data.preferred_language
            
        # Update Profile level fields
        profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
        if not profile:
            profile = UserProfile(user_id=current_user.id)
            db.add(profile)
            
        if data.full_name is not None:
            profile.full_name = data.full_name
        if data.preferred_name is not None:
            profile.preferred_name = data.preferred_name
        if data.age is not None:
            profile.age = data.age
        if data.profession is not None:
            profile.profession = data.profession
            
        db.commit()
        
        return get_user_profile(current_user=current_user, db=db)
    except Exception as e:
        db.rollback()
        print(f"[PROFILE_ERROR] Update failed for User {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")
