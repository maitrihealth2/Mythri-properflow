from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database.models import get_db, User, UserFeedback
from security.authentication.api import get_current_user

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

class FeedbackRequest(BaseModel):
    content: str

@router.post("/submit")
def submit_feedback(request: FeedbackRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not request.content or not request.content.strip():
        raise HTTPException(status_code=400, detail="Feedback content cannot be empty")
        
    feedback = UserFeedback(
        user_id=current_user.id,
        content=request.content.strip()
    )
    db.add(feedback)
    db.commit()
    
    return {"status": "success", "message": "Feedback submitted successfully"}
