"""
Short-Term Memory Engine Subsystem
Represents Maitri's session-scoped working memory.
Maintains turn facts, active emotional state, in-session topics, user corrections, temporary preferences,
and unresolved questions for the active conversation session.
Completely independent from Long-Term Memory and Episodic Memory.
Contains zero retrieval, zero prompt injection, and zero LLM provider dependencies.
"""
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Set


class WorkingMemoryKind(str, Enum):
    TURN_FACT = "turn_fact"
    EMOTIONAL_STATE = "emotional_state"
    ACTIVE_TOPIC = "active_topic"
    SESSION_GOAL = "session_goal"
    USER_CORRECTION = "user_correction"
    TEMPORARY_PREFERENCE = "temporary_preference"
    UNRESOLVED_QUESTION = "unresolved_question"
    CONVERSATIONAL_CONTEXT = "conversational_context"


@dataclass
class ShortTermMemoryItem:
    """
    Dedicated working memory item model for Short-Term Memory.
    Independent from Long-Term Memory entities.
    """
    item_id: str
    session_id: int
    user_id: int
    kind: WorkingMemoryKind
    content: str
    token_estimate: int = 10
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    is_expired: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    def mark_expired(self) -> None:
        """Mark item as expired within session scope."""
        self.is_expired = True
        self.updated_at = datetime.utcnow()


@dataclass
class ShortTermMemorySession:
    """
    Session-scoped working memory container holding active working memory items,
    session emotion, active topics, and memory limits.
    """
    session_id: int
    user_id: int
    items: List[ShortTermMemoryItem] = field(default_factory=list)
    active_topics: Set[str] = field(default_factory=set)
    current_emotion: Optional[str] = None
    max_items: int = 20
    max_token_estimate: int = 1000

    @property
    def total_tokens(self) -> int:
        """Calculate total estimated tokens across active working memory items."""
        return sum(item.token_estimate for item in self.items if not item.is_expired)

    @property
    def active_items(self) -> List[ShortTermMemoryItem]:
        """Return non-expired working memory items."""
        return [item for item in self.items if not item.is_expired]


class ShortTermMemoryEngine:
    """
    Pure Short-Term Memory Engine.
    Manages session-scoped working memory lifecycles, operations, and limits.
    """

    def __init__(self):
        # Session storage map keyed by Session ID
        self._sessions: Dict[int, ShortTermMemorySession] = {}

    def get_or_create_session(
        self, session_id: int, user_id: int, max_items: int = 20, max_tokens: int = 1000
    ) -> ShortTermMemorySession:
        """Get or initialize a ShortTermMemorySession for an active conversation."""
        if session_id not in self._sessions:
            self._sessions[session_id] = ShortTermMemorySession(
                session_id=session_id,
                user_id=user_id,
                max_items=max_items,
                max_token_estimate=max_tokens,
            )
        return self._sessions[session_id]

    def add_item(
        self,
        session_id: int,
        user_id: int,
        kind: WorkingMemoryKind,
        content: str,
        token_estimate: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ShortTermMemoryItem:
        """
        Add a working memory item to the active session container.
        """
        session = self.get_or_create_session(session_id, user_id)
        
        # Estimate token count (rough heuristic ~ 4 chars per token)
        est_tokens = token_estimate if token_estimate is not None else max(1, len(content) // 4)

        item = ShortTermMemoryItem(
            item_id=str(uuid.uuid4()),
            session_id=session_id,
            user_id=user_id,
            kind=kind,
            content=content,
            token_estimate=est_tokens,
            metadata=metadata or {},
        )

        session.items.append(item)

        # Update session-level working state helpers
        if kind == WorkingMemoryKind.ACTIVE_TOPIC:
            session.active_topics.add(content.lower())
        elif kind == WorkingMemoryKind.EMOTIONAL_STATE:
            session.current_emotion = content

        # Check limits stub
        self.apply_trimming_strategy_stub(session_id)

        return item

    def update_item(
        self, session_id: int, item_id: str, new_content: str
    ) -> Optional[ShortTermMemoryItem]:
        """Update working memory content for an active session item."""
        session = self._sessions.get(session_id)
        if not session:
            return None

        for item in session.items:
            if item.item_id == item_id and not item.is_expired:
                item.content = new_content
                item.updated_at = datetime.utcnow()
                item.token_estimate = max(1, len(new_content) // 4)
                return item

        return None

    def remove_expired_items(self, session_id: int) -> int:
        """Purge items explicitly marked expired from the session container."""
        session = self._sessions.get(session_id)
        if not session:
            return 0

        initial_count = len(session.items)
        session.items = [item for item in session.items if not item.is_expired]
        return initial_count - len(session.items)

    def read_working_memory(self, session_id: int) -> Optional[ShortTermMemorySession]:
        """Read current active working memory for a session."""
        return self._sessions.get(session_id)

    def clear_session(self, session_id: int) -> bool:
        """Clean up and release session-scoped working memory upon session termination."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    # ── Extension Point Hooks (Stubs for Future Promotion & Trimming) ─────────

    def promote_to_episodic_stub(self, session_id: int) -> Dict[str, Any]:
        """
        Extension Point Stub: Future promotion of session working memory into Episodic Memory.
        Fired at session closure to synthesize turn history into episodic notes.
        """
        session = self._sessions.get(session_id)
        if not session:
            return {}
        return {
            "session_id": session_id,
            "topics": list(session.active_topics),
            "final_emotion": session.current_emotion,
            "working_items_count": len(session.active_items),
        }

    def promote_to_long_term_stub(self, session_id: int) -> List[Dict[str, Any]]:
        """
        Extension Point Stub: Future promotion of validated working memory facts into Long-Term Memory.
        """
        session = self._sessions.get(session_id)
        if not session:
            return []
        return [
            {"kind": item.kind.value, "content": item.content}
            for item in session.active_items
            if item.kind in (WorkingMemoryKind.TURN_FACT, WorkingMemoryKind.TEMPORARY_PREFERENCE)
        ]

    def apply_trimming_strategy_stub(self, session_id: int) -> int:
        """
        Extension Point Stub: Future automatic trimming strategy when max_items or max_tokens exceeded.
        """
        session = self._sessions.get(session_id)
        if not session:
            return 0

        # If items exceed max_items, expire oldest items (FIFO heuristic)
        trimmed = 0
        while len(session.active_items) > session.max_items:
            active = session.active_items
            active[0].mark_expired()
            trimmed += 1

        return trimmed


# Global singleton instance for active working session access across API calls
short_term_engine = ShortTermMemoryEngine()
