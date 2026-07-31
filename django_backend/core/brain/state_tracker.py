"""
Session State Tracker — In-memory working memory for each active conversation.

Tracks:
  - Emotion trajectory (recent_emotions)
  - Crisis risk level
  - Onboarding status (is this user's first session?)
  - Probed dimensions (what has already been asked this session)
  - Exercise state machine (IDLE → SUGGESTED → IN_PROGRESS → AWAITING_FEEDBACK → COMPLETED/DROPPED)
  - Per-session behavioral observations for persona updater
"""
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime
import json

def empty_case_file() -> dict:
    return {
      "conversation_state": {
        "facts": [],
        "emotion": {"value": None, "confidence": 0.0, "source": "inferred"},
        "emotion_history": [],
        "conversation_goal": "unknown",
        "risk_level": "none",
        "phase": "opening",
        "possible_contradiction": False,
        "asked_topics": [],
        "recommended_question": None
      },
      "runtime_state": {
        "decision": "RESPOND",
        "exercise_in_progress": False,
        "turns_since_last_question": 0,
        "give_up_asking": False
      }
    }

# Valid exercise states (ordered lifecycle)
EXERCISE_STATES = ["idle", "suggested", "in_progress", "awaiting_feedback", "completed", "dropped"]

# Dimensions the Analyst can probe — prevents re-asking the same angle
PROBEABLE_DIMENSIONS = [
    "trigger",           # What specifically caused this?
    "duration",          # How long has this been going on?
    "physical_sensation",# Any physical symptoms (tight chest, fatigue)?
    "past_experience",   # Has this happened before? How did they handle it?
    "support_system",    # Who do they have around them?
    "coping_attempts",   # What have they already tried?
    "impact",            # How is this affecting daily life?
]


class SessionState(BaseModel):
    session_id: int

    # Emotion tracking
    current_emotion: str = "Neutral"
    recent_emotions: List[str] = Field(default_factory=list)
    crisis_risk_level: str = "Low"          # Low | Medium | High
    active_therapy_goal: Optional[str] = None

    # Onboarding
    is_onboarding: bool = False             # True only in session 1, cleared when complete
    onboarding_turns: int = 0              # Counts turns during onboarding

    # Intelligent probing — prevents re-asking same angle
    probed_dimensions: List[str] = Field(default_factory=list)

    # Exercise state machine
    exercise_state: str = "idle"            # See EXERCISE_STATES
    active_exercise_type: Optional[str] = None  # BREATHING | GROUNDING | REFLECTION | BODY_SCAN | COGNITIVE_REFRAME
    exercise_triggered_by: Optional[str] = None  # analyst_trajectory | analyst_pattern | user_requested
    exercise_pre_emotion: Optional[str] = None

    # Per-session behavioral observations (for persona updater)
    session_message_lengths: List[int] = Field(default_factory=list)
    session_emotions_seen: List[str] = Field(default_factory=list)

    # MAITRI AGENT LOOP v2 Case File
    case_file_json: dict = Field(default_factory=empty_case_file)

    last_updated: datetime = Field(default_factory=datetime.utcnow)


class StateTracker:
    def __init__(self):
        self._states: Dict[int, SessionState] = {}
        self._max_recent_emotions = 5   # Increased for trajectory analysis

    def get_state(self, session_id: int) -> SessionState:
        if session_id not in self._states:
            self._states[session_id] = SessionState(session_id=session_id)
        return self._states[session_id]

    def init_session(self, session_id: int, is_first_session: bool):
        """Called when a new session starts. Sets onboarding flag if first-ever session."""
        state = self.get_state(session_id)
        state.is_onboarding = is_first_session
        state.case_file_json = empty_case_file()
        state.last_updated = datetime.utcnow()

    def get_case_file(self, session_id: int) -> dict:
        return self.get_state(session_id).case_file_json

    def update_case_file(self, session_id: int, case_file: dict):
        state = self.get_state(session_id)
        state.case_file_json = case_file
        state.last_updated = datetime.utcnow()

    def update_emotion(self, session_id: int, emotion: str):
        state = self.get_state(session_id)
        state.current_emotion = emotion
        state.recent_emotions.append(emotion)
        if len(state.recent_emotions) > self._max_recent_emotions:
            state.recent_emotions.pop(0)
        state.session_emotions_seen.append(emotion)
        state.last_updated = datetime.utcnow()

    def record_message_length(self, session_id: int, length: int):
        """Track message lengths for fragmentation/withdrawal detection."""
        state = self.get_state(session_id)
        state.session_message_lengths.append(length)
        state.last_updated = datetime.utcnow()

    def mark_dimension_probed(self, session_id: int, dimension: str):
        """Record that the Analyst asked about this dimension — prevent re-probing."""
        state = self.get_state(session_id)
        if dimension not in state.probed_dimensions:
            state.probed_dimensions.append(dimension)
        state.last_updated = datetime.utcnow()

    def increment_onboarding_turn(self, session_id: int):
        state = self.get_state(session_id)
        state.onboarding_turns += 1
        state.last_updated = datetime.utcnow()

    def complete_onboarding(self, session_id: int):
        state = self.get_state(session_id)
        state.is_onboarding = False
        state.last_updated = datetime.utcnow()

    # ── Exercise State Machine ───────────────────────────────────────────────

    def suggest_exercise(self, session_id: int, exercise_type: str, triggered_by: str, pre_emotion: str):
        state = self.get_state(session_id)
        state.exercise_state = "suggested"
        state.active_exercise_type = exercise_type
        state.exercise_triggered_by = triggered_by
        state.exercise_pre_emotion = pre_emotion
        state.last_updated = datetime.utcnow()

    def advance_exercise_state(self, session_id: int, new_state: str):
        """Move exercise through its lifecycle. Validates legal transitions."""
        state = self.get_state(session_id)
        if new_state in EXERCISE_STATES:
            state.exercise_state = new_state
            state.last_updated = datetime.utcnow()

    def reset_exercise(self, session_id: int):
        """Clear exercise state back to idle after completion/drop."""
        state = self.get_state(session_id)
        state.exercise_state = "idle"
        state.active_exercise_type = None
        state.exercise_triggered_by = None
        state.exercise_pre_emotion = None
        state.last_updated = datetime.utcnow()

    # ── Crisis ───────────────────────────────────────────────────────────────

    def set_crisis_risk(self, session_id: int, level: str):
        state = self.get_state(session_id)
        state.crisis_risk_level = level
        state.last_updated = datetime.utcnow()

    def set_active_goal(self, session_id: int, goal: str):
        state = self.get_state(session_id)
        state.active_therapy_goal = goal
        state.last_updated = datetime.utcnow()

    # ── Summary for Analyst ──────────────────────────────────────────────────

    def get_summary(self, session_id: int) -> str:
        state = self.get_state(session_id)
        parts = [
            f"Emotion: {state.current_emotion} "
            f"(trajectory: {' → '.join(state.recent_emotions) if state.recent_emotions else 'None'})",
            f"Risk: {state.crisis_risk_level}",
        ]
        if state.active_therapy_goal:
            parts.append(f"Goal: {state.active_therapy_goal}")
        if state.is_onboarding:
            parts.append(f"ONBOARDING ACTIVE (turn {state.onboarding_turns})")
        if state.probed_dimensions:
            parts.append(f"Already probed: {', '.join(state.probed_dimensions)}")
        else:
            parts.append("No dimensions probed yet this session")
        if state.exercise_state != "idle":
            parts.append(f"Exercise: {state.active_exercise_type} [{state.exercise_state.upper()}]")
        return " | ".join(parts)

    def get_exercise_context(self, session_id: int) -> dict:
        """Return exercise state dict for the Analyst and API layer."""
        state = self.get_state(session_id)
        return {
            "state": state.exercise_state,
            "type": state.active_exercise_type,
            "triggered_by": state.exercise_triggered_by,
            "pre_emotion": state.exercise_pre_emotion,
        }


# Global singleton
tracker = StateTracker()

