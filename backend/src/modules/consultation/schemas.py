from pydantic import BaseModel, Field
from typing import Optional, List

class StartSessionResponse(BaseModel):
    session_id: str = Field(..., description="Unique token representing the consultation session")
    message: str
    is_first_session: bool = False


class ChatRequest(BaseModel):
    session_id: str
    message: str = Field(..., min_length=1, max_length=5000, description="The user's input text")
    language: str = Field(default="en-IN")


class ChatResponse(BaseModel):
    responses: List[str]
    is_crisis: bool
    helplines: List[str]
    session_id: str
    emotion: str
    emotion_emoji: str
    emotion_score: float
    rag_used: bool
    exercise_state: str = "idle"
    exercise_type: Optional[str] = None
