"""
Memory Consolidation Engine Subsystem
Evaluates completed Short-Term Memory sessions and determines memory promotion outcomes:
Promote to Episodic Memory, Promote to Long-Term Memory, or Discard.
Produces structured ConsolidationPlan objects and StructuredSessionSynthesis containers without writing to persistence.
Contains zero retrieval, zero prompt construction, and zero LLM calls.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

from modules.memory.domain import (
    MemoryCategory,
    MemoryEntity,
    MemoryKind,
    MemoryMetadata,
    MemorySource,
    MemoryStatus,
)
from modules.memory.short_term import (
    ShortTermMemoryItem,
    ShortTermMemorySession,
    WorkingMemoryKind,
)


class PromotionOutcome(str, Enum):
    EPISODIC = "episodic"
    LONG_TERM = "long_term"
    DISCARD = "discard"


@dataclass
class StructuredSessionSynthesis:
    """
    Structured representation of a completed session experience.
    Synthesizes session metrics and topics without natural language generation or LLM calls.
    """
    session_id: int
    user_id: int
    primary_emotion: Optional[str] = None
    active_topics: List[str] = field(default_factory=list)
    structured_highlights: List[str] = field(default_factory=list)
    item_count: int = 0
    estimated_tokens: int = 0


@dataclass
class ConsolidationPlan:
    """
    Actionable consolidation output specifying candidate promotions and discarded working items.
    Does not execute persistence; provides pure plan specification.
    """
    session_id: int
    user_id: int
    synthesis: StructuredSessionSynthesis
    candidate_episodic_memories: List[MemoryEntity] = field(default_factory=list)
    candidate_long_term_memories: List[MemoryEntity] = field(default_factory=list)
    discarded_items: List[ShortTermMemoryItem] = field(default_factory=list)
    promotion_reasons: Dict[str, str] = field(default_factory=dict)
    confidence_metadata: Dict[str, float] = field(default_factory=dict)

    @property
    def total_promotions_count(self) -> int:
        """Total candidate memories slated for promotion."""
        return len(self.candidate_episodic_memories) + len(self.candidate_long_term_memories)


class MemoryConsolidationEngine:
    """
    Pure Memory Consolidation Engine.
    Evaluates completed ShortTermMemorySessions and emits structured ConsolidationPlans.
    """

    def consolidate_session(self, session: ShortTermMemorySession) -> ConsolidationPlan:
        """
        Evaluate a completed ShortTermMemorySession and construct a structured ConsolidationPlan.
        """
        user_id = session.user_id
        session_id = session.session_id

        candidate_episodic: List[MemoryEntity] = []
        candidate_long_term: List[MemoryEntity] = []
        discarded: List[ShortTermMemoryItem] = []
        reasons: Dict[str, str] = {}
        confidence_map: Dict[str, float] = {}

        highlights: List[str] = []

        for item in session.items:
            if item.is_expired:
                discarded.append(item)
                reasons[item.item_id] = "Expired working item discarded."
                continue

            # 1. Evaluate Long-Term Memory Promotion Criteria
            if item.kind in (WorkingMemoryKind.TURN_FACT, WorkingMemoryKind.TEMPORARY_PREFERENCE, WorkingMemoryKind.SESSION_GOAL):
                category = (
                    MemoryCategory.GOAL if item.kind == WorkingMemoryKind.SESSION_GOAL
                    else (MemoryCategory.PREFERENCE if item.kind == WorkingMemoryKind.TEMPORARY_PREFERENCE else MemoryCategory.FACT)
                )
                meta = MemoryMetadata(
                    user_id=user_id,
                    memory_kind=MemoryKind.LONG_TERM,
                    category=category,
                    importance=0.70,
                    confidence=0.90,
                    source=MemorySource.SESSION_SUMMARY,
                    origin_session=session_id,
                    status=MemoryStatus.CANDIDATE,
                )
                entity = MemoryEntity(content=item.content, metadata=meta)
                candidate_long_term.append(entity)
                reasons[item.item_id] = f"Promoted to Long-Term Memory ({category.value}): Stable user statement."
                confidence_map[item.item_id] = 0.90
                highlights.append(item.content)

            # 2. Evaluate Episodic Memory Promotion Criteria
            elif item.kind in (WorkingMemoryKind.EMOTIONAL_STATE, WorkingMemoryKind.ACTIVE_TOPIC, WorkingMemoryKind.CONVERSATIONAL_CONTEXT):
                meta = MemoryMetadata(
                    user_id=user_id,
                    memory_kind=MemoryKind.EPISODIC,
                    category=MemoryCategory.EPISODE,
                    importance=0.50,
                    confidence=0.85,
                    source=MemorySource.SESSION_SUMMARY,
                    origin_session=session_id,
                    status=MemoryStatus.CANDIDATE,
                )
                entity = MemoryEntity(content=f"Session {session_id} aspect: {item.content}", metadata=meta)
                candidate_episodic.append(entity)
                reasons[item.item_id] = "Promoted to Episodic Memory: Significant session narrative event."
                confidence_map[item.item_id] = 0.85

            # 3. Evaluate Discard Criteria
            else:
                discarded.append(item)
                reasons[item.item_id] = "Discarded: Transient working question or unverified dialogue filler."
                confidence_map[item.item_id] = 0.30

        # Construct Structured Session Synthesis
        synthesis = StructuredSessionSynthesis(
            session_id=session_id,
            user_id=user_id,
            primary_emotion=session.current_emotion,
            active_topics=list(session.active_topics),
            structured_highlights=highlights,
            item_count=len(session.items),
            estimated_tokens=session.total_tokens,
        )

        plan = ConsolidationPlan(
            session_id=session_id,
            user_id=user_id,
            synthesis=synthesis,
            candidate_episodic_memories=candidate_episodic,
            candidate_long_term_memories=candidate_long_term,
            discarded_items=discarded,
            promotion_reasons=reasons,
            confidence_metadata=confidence_map,
        )

        # Trigger Future Extension Hooks
        self._reflection_engine_stub(plan)
        self._memory_compression_stub(plan)

        return plan

    # ── Future Extensibility Hooks (Stubs for Reflection & Aggregation) ──────

    def _reflection_engine_stub(self, plan: ConsolidationPlan) -> None:
        """Extension Point Stub: Hook for future Reflection Engine synthesis."""
        pass

    def _daily_consolidation_stub(self, plans: List[ConsolidationPlan]) -> None:
        """Extension Point Stub: Hook for future batch daily memory consolidation."""
        pass

    def _weekly_summary_stub(self, plans: List[ConsolidationPlan]) -> None:
        """Extension Point Stub: Hook for future weekly therapeutic trend summaries."""
        pass

    def _memory_compression_stub(self, plan: ConsolidationPlan) -> None:
        """Extension Point Stub: Hook for future memory compression and deduplication."""
        pass

    def _cognitive_insights_stub(self, plan: ConsolidationPlan) -> None:
        """Extension Point Stub: Hook for future cognitive insight extraction."""
        pass
