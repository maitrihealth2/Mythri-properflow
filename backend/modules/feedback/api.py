from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.database.models import get_db, User, UserFeedback
from security.authentication.api import get_current_user

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

class FeedbackRequest(BaseModel):
    content: Optional[str] = Field(default="", max_length=5000)
    rating: Optional[int] = Field(default=5, ge=1, le=5)
    ratings: Optional[Dict[str, int]] = Field(default=None)
    session_id: Optional[int] = None
    feedback_type: Optional[str] = Field(default="general", max_length=50)

@router.post("/submit")
def submit_feedback(
    request: FeedbackRequest, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    content_clean = (request.content or "").strip()
    
    # Require either text content or structured rating
    if not content_clean and not request.ratings and not request.rating:
        raise HTTPException(status_code=400, detail="Please provide a rating or feedback message")
        
    feedback = UserFeedback(
        user_id=current_user.id,
        content=content_clean,
        rating=request.rating or 5,
        ratings=request.ratings,
        session_id=request.session_id,
        feedback_type=request.feedback_type or "general"
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    
    return {
        "status": "success", 
        "message": "Thank you for sharing your feedback with Mythri!",
        "feedback_id": feedback.id
    }
