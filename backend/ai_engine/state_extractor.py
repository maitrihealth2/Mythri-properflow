from pydantic import BaseModel, Field
from typing import Optional

class UserState(BaseModel):
    """
    The 10 Core Parameters that represent a user's current psychological 
    and conversational state based on their message.
    """
    emotion: str = Field(description="The primary emotion detected (e.g., Happy, Sad, Anxious)")
    intensity: float = Field(ge=0.0, le=1.0, description="How strongly the emotion is expressed (0.0 to 1.0)")
    distress: float = Field(ge=0.0, le=1.0, description="How psychologically overwhelmed the person appears (0.0 to 1.0)")
    intent: str = Field(description="Goal of message (e.g., Venting, Seeking advice, Casual)")
    arousal: float = Field(ge=0.0, le=1.0, description="Physical/mental energy or activation level (0.0 to 1.0)")
    sensitivity: float = Field(ge=0.0, le=1.0, description="How delicate or high-stakes the topic is (0.0 to 1.0)")
    engagement: float = Field(ge=0.0, le=1.0, description="How invested they are in the conversation (0.0 to 1.0)")
    concern: str = Field(description="The actual core subject matter or problem they are facing")
    risk_level: str = Field(description="Immediate safety risk (e.g., Low, Moderate, High)")
    risk_score: float = Field(ge=0.0, le=1.0, description="Probability score of risk (0.0 to 1.0)")

class StateExtractor:
    """
    Service responsible for converting LLM outputs into structured UserState.
    """
    @staticmethod
    def extract_state(llm_response_json: dict) -> UserState:
        """
        Parses the raw JSON from the LLM prompt and validates it using Pydantic.
        """
        try:
            return UserState(**llm_response_json)
        except Exception as e:
            # In production, we'd log this and return a safe default
            raise ValueError(f"Failed to extract state: {e}")
