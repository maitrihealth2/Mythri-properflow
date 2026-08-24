from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProfileResponse(BaseModel):
    # Personal Info
    username: str
    email: str
    full_name: Optional[str] = None
    preferred_name: Optional[str] = None
    age: Optional[int] = None
    profession: Optional[str] = None
    
    # Regional Info
    preferred_language: str
    
    # Status / setup
    is_email_verified: bool = False
    member_since: Optional[datetime] = None
    setup_percentage: Optional[int] = None
    
    # Onboarding details
    onboarding_summary: Optional[str] = None
    onboarding_goals: Optional[list[str]] = None
    onboarding_reasons: Optional[list[str]] = None
    conversation_style: Optional[str] = None

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    preferred_name: Optional[str] = None
    age: Optional[int] = None
    profession: Optional[str] = None
    preferred_language: Optional[str] = None
