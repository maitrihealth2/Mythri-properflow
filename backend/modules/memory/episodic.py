"""
Episodic Memory Subsystem
Dedicated domain representation and persistence abstraction for Episodic Memory ("what happened").
Stores structured session experiences (session ID, time window, primary emotion, emotional arc,
active topics, significant events, session highlights) independently of Long-Term Memory entities.
Contains zero retrieval engine logic, zero ranking, zero prompt construction, and zero LLM calls.
"""
import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from core.database.models import ConsultationNote
from modules.memory.domain import MemoryStatus


@dataclass
class EpisodicExperience:
    """
    Dedicated Episodic Memory domain entity.
    Captures complete session experience in structured form without natural language LLM generation.
    """
    session_id: int
    user_id: int
    primary_emotion: str = "neutral"
    emotional_arc: List[str] = field(default_factory=list)
    active_topics: List[str] = field(default_factory=list)
    significant_events: List[str] = field(default_factory=list)
    session_highlights: List[str] = field(default_factory=list)
    start_time: datetime = field(default_factory=datetime.utcnow)
    end_time: datetime = field(default_factory=datetime.utcnow)
    confidence: float = 1.0
    status: MemoryStatus = MemoryStatus.STORED
    episode_id: Optional[int] = None

    def to_orm_dict(self) -> Dict[str, Any]:
        """Serialize structured experience into ConsultationNote ORM dictionary format."""
        summary_payload = {
            "primary_emotion": self.primary_emotion,
            "emotional_arc": self.emotional_arc,
            "active_topics": self.active_topics,
            "session_highlights": self.session_highlights,
        }
        return {
            "session_id": self.session_id,
            "summary": json.dumps(summary_payload),
            "key_insights": json.dumps(self.significant_events),
            "next_steps": json.dumps({"confidence": self.confidence, "status": self.status.value}),
        }

    @classmethod
    def from_orm_instance(cls, instance: Any) -> "EpisodicExperience":
        """Reconstruct EpisodicExperience from ConsultationNote ORM instance."""
        session_id = getattr(instance, "session_id", 0)
        summary_raw = getattr(instance, "summary", "{}")
        try:
            summary_data = json.loads(summary_raw)
        except Exception:
            summary_data = {"summary_text": summary_raw}

        key_insights_raw = getattr(instance, "key_insights", "[]")
        try:
            significant_events = json.loads(key_insights_raw)
        except Exception:
            significant_events = [key_insights_raw] if key_insights_raw else []

        return cls(
            episode_id=getattr(instance, "id", None),
            session_id=session_id,
            user_id=getattr(getattr(instance, "session", None), "user_id", 0),
            primary_emotion=summary_data.get("primary_emotion", "neutral"),
            emotional_arc=summary_data.get("emotional_arc", []),
            active_topics=summary_data.get("active_topics", []),
            session_highlights=summary_data.get("session_highlights", []),
            significant_events=significant_events,
            start_time=getattr(instance, "created_at", datetime.utcnow()),
            end_time=getattr(instance, "updated_at", datetime.utcnow()),
        )


class EpisodicMemoryStoreProtocol(ABC):
    """Abstract protocol for Episodic Memory store operations."""

    @abstractmethod
    def create_episode(self, episode: EpisodicExperience) -> EpisodicExperience:
        """Persist a new episodic experience."""
        pass

    @abstractmethod
    def update_episode(self, episode: EpisodicExperience) -> EpisodicExperience:
        """Update an existing episodic experience."""
        pass

    @abstractmethod
    def archive_episode(self, episode_id: int) -> bool:
        """Soft-archive an episodic experience."""
        pass

    @abstractmethod
    def get_episode_by_id(self, episode_id: int) -> Optional[EpisodicExperience]:
        """Fetch an episode by primary key ID."""
        pass

    @abstractmethod
    def get_episodes_by_user(self, user_id: int, limit: int = 20) -> List[EpisodicExperience]:
        """Fetch episodes for a specific user."""
        pass


class EpisodicMemoryStore(EpisodicMemoryStoreProtocol):
    """
    Production Episodic Memory Store implementation.
    Isolates ORM persistence for ConsultationNote schemas behind clean domain entity interfaces.
    """

    def __init__(self, db_session: Session):
        self.db = db_session

    def create_episode(self, episode: EpisodicExperience) -> EpisodicExperience:
        """Persist a new EpisodicExperience into consultation_notes table."""
        orm_data = episode.to_orm_dict()
        db_model = ConsultationNote(**orm_data)
        self.db.add(db_model)
        self.db.commit()
        self.db.refresh(db_model)

        episode.episode_id = db_model.id
        return episode

    def update_episode(self, episode: EpisodicExperience) -> EpisodicExperience:
        """Update an existing ConsultationNote record from modified EpisodicExperience."""
        if not episode.episode_id:
            raise ValueError("Cannot update EpisodicExperience without valid episode_id")

        db_model = (
            self.db.query(ConsultationNote)
            .filter(ConsultationNote.id == episode.episode_id)
            .first()
        )
        if not db_model:
            raise KeyError(f"ConsultationNote with ID {episode.episode_id} not found")

        orm_data = episode.to_orm_dict()
        db_model.summary = orm_data["summary"]
        db_model.key_insights = orm_data["key_insights"]
        db_model.next_steps = orm_data["next_steps"]

        self.db.commit()
        self.db.refresh(db_model)
        return EpisodicExperience.from_orm_instance(db_model)

    def archive_episode(self, episode_id: int) -> bool:
        """Soft-archive an episode by setting status to ARCHIVED."""
        episode = self.get_episode_by_id(episode_id)
        if not episode:
            return False

        episode.status = MemoryStatus.ARCHIVED
        self.update_episode(episode)
        return True

    def get_episode_by_id(self, episode_id: int) -> Optional[EpisodicExperience]:
        """Fetch a single ConsultationNote by ID and reconstruct EpisodicExperience."""
        db_model = (
            self.db.query(ConsultationNote)
            .filter(ConsultationNote.id == episode_id)
            .first()
        )
        if not db_model:
            return None
        return EpisodicExperience.from_orm_instance(db_model)

    def get_episodes_by_user(self, user_id: int, limit: int = 20) -> List[EpisodicExperience]:
        """Fetch episodes for a user ordered chronologically."""
        db_models = (
            self.db.query(ConsultationNote)
            .order_by(ConsultationNote.created_at.desc())
            .limit(limit)
            .all()
        )
        return [EpisodicExperience.from_orm_instance(m) for m in db_models]

    # ── Future Extensibility Hooks (Stubs) ───────────────────────────────────

    def _reflection_engine_episode_hook(self, episode: EpisodicExperience) -> None:
        """Extension Point Stub: Hook for future Reflection Engine processing."""
        pass

    def _daily_journal_hook(self, user_id: int, date_str: str) -> None:
        """Extension Point Stub: Hook for future Daily Journal generation."""
        pass

    def _weekly_summary_hook(self, user_id: int) -> None:
        """Extension Point Stub: Hook for future Weekly Summary synthesis."""
        pass

    def _narrative_generation_hook(self, episode: EpisodicExperience) -> None:
        """Extension Point Stub: Hook for future Narrative Generation."""
        pass

    def _therapeutic_timeline_hook(self, user_id: int) -> None:
        """Extension Point Stub: Hook for future Therapeutic Timeline visualization."""
        pass
