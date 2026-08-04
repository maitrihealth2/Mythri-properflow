"""
Memory Types & Data Models
Defines core data structures and enums for the Maitri Memory System.
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class MemoryType(str, Enum):
    SHORT_TERM = "short_term"   # Session working memory
    EPISODIC = "episodic"       # Cross-session event summaries
    LONG_TERM = "long_term"     # User core facts, beliefs, & traits


class MemoryImportance(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class MemoryCategory(str, Enum):
    FACT = "fact"
    BELIEF = "belief"
    PREFERENCE = "preference"
    GOAL = "goal"
    RELATIONSHIP = "relationship"
    EVENT = "event"
    EPISODE_SUMMARY = "episode_summary"


class MemoryEventType(str, Enum):
    CONVERSATION_STARTED = "conversation_started"
    USER_MESSAGE_RECEIVED = "user_message_received"
    ASSISTANT_RESPONSE_GENERATED = "assistant_response_generated"
    SESSION_CLOSED = "session_closed"


@dataclass
class MemoryItem:
    id: Optional[int] = None
    user_id: Optional[int] = None
    memory_type: MemoryType = MemoryType.LONG_TERM
    category: MemoryCategory = MemoryCategory.FACT
    content: str = ""
    importance_score: float = 0.5
    confidence_score: float = 1.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MemoryContext:
    short_term_context: Dict[str, Any] = field(default_factory=dict)
    episodic_context: List[MemoryItem] = field(default_factory=list)
    long_term_context: List[MemoryItem] = field(default_factory=list)
    raw_prompt_block: str = ""

    @property
    def is_empty(self) -> bool:
        return (
            not self.short_term_context
            and not self.episodic_context
            and not self.long_term_context
            and not self.raw_prompt_block
        )


@dataclass
class MemoryQueryResult:
    items: List[MemoryItem] = field(default_factory=list)
    total_count: int = 0
    retrieval_latency_ms: float = 0.0


@dataclass
class MemoryEvent:
    event_type: MemoryEventType
    user_id: int
    session_id: Optional[int] = None
    payload: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
