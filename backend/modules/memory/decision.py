"""
Memory Decision Engine Subsystem
Pure domain decision engine responsible for evaluating candidate memory items and producing
actionable decisions (Create New, Update, Merge, Ignore, Archive, Reject).
Contains zero persistence, retrieval, vector search, or LLM dependencies.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from modules.memory.domain import (
    ConflictAction,
    MemoryCategory,
    MemoryEntity,
    MemoryStatus,
)
from modules.memory.extractor import ExtractionCandidate
from modules.memory.policies import MemoryConflictPolicy, MemoryQualityPolicy


class DecisionOutcome(str, Enum):
    CREATE_NEW = "create_new"
    UPDATE_EXISTING = "update_existing"
    MERGE_INTO_EXISTING = "merge_into_existing"
    IGNORE_CANDIDATE = "ignore_candidate"
    ARCHIVE_EXISTING = "archive_existing"
    REJECT_CANDIDATE = "reject_candidate"


@dataclass
class MemoryDecision:
    """
    Actionable decision output produced by the Memory Decision Engine.
    Designed for seamless execution by MemoryManager without further interpretation.
    """
    outcome: DecisionOutcome
    candidate: MemoryEntity
    target_memory_id: Optional[int] = None
    reason: str = ""
    decision_confidence: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def is_actionable(self) -> bool:
        """Returns True if the decision requires a persistence change."""
        return self.outcome in (
            DecisionOutcome.CREATE_NEW,
            DecisionOutcome.UPDATE_EXISTING,
            DecisionOutcome.MERGE_INTO_EXISTING,
            DecisionOutcome.ARCHIVE_EXISTING,
        )


# ── Extension Point Interfaces (Stubs for Future Vector Duplicate & Conflict Search) ────

class DuplicateDetectorProtocol(ABC):
    """Protocol stub for future vector/similarity duplicate detection."""

    @abstractmethod
    def find_duplicate(
        self, candidate: MemoryEntity, user_id: int
    ) -> Optional[Tuple[MemoryEntity, float]]:
        """Find potential existing duplicate memory and similarity score."""
        pass


class ConflictResolverProtocol(ABC):
    """Protocol stub for future multi-turn conflict resolution."""

    @abstractmethod
    def evaluate_conflict(
        self, candidate: MemoryEntity, existing: MemoryEntity
    ) -> ConflictAction:
        """Evaluate conflict action between candidate and existing memory."""
        pass


# ── Pure Decision Engine Implementation ──────────────────────────────────────

class MemoryDecisionEngine:
    """
    Pure Memory Decision Engine.
    Evaluates candidate memories against domain policies and structural constraints
    to emit explicit MemoryDecision objects.
    """

    def evaluate_candidate(
        self,
        candidate_item: ExtractionCandidate | MemoryEntity,
        existing_memories: Optional[List[MemoryEntity]] = None,
    ) -> MemoryDecision:
        """
        Evaluate a candidate memory and determine the canonical DecisionOutcome.
        """
        # Convert ExtractionCandidate to MemoryEntity if necessary
        if isinstance(candidate_item, ExtractionCandidate):
            entity = candidate_item.to_domain_entity()
        else:
            entity = candidate_item

        # 1. Quality Policy Filter Check
        if not MemoryQualityPolicy.validate_candidate(entity):
            return MemoryDecision(
                outcome=DecisionOutcome.REJECT_CANDIDATE,
                candidate=entity,
                reason="Candidate failed domain quality validation or confidence threshold (<0.70).",
                decision_confidence=1.0,
            )

        # 2. Importance & Content Filtering
        if entity.metadata.importance < 0.20:
            return MemoryDecision(
                outcome=DecisionOutcome.IGNORE_CANDIDATE,
                candidate=entity,
                reason="Candidate importance score below operational threshold (<0.20).",
                decision_confidence=1.0,
            )

        # 3. Candidate Evaluation against Existing Context (if provided)
        if existing_memories:
            for existing in existing_memories:
                # Check exact content match (Merge/Ignore)
                if existing.content.strip().lower() == entity.content.strip().lower():
                    return MemoryDecision(
                        outcome=DecisionOutcome.MERGE_INTO_EXISTING,
                        candidate=entity,
                        target_memory_id=existing.metadata.memory_id,
                        reason="Identical content detected in existing memory; merge timestamps.",
                        decision_confidence=0.95,
                    )

                # Check conflict policy resolution
                conflict_action, conflict_reason = MemoryConflictPolicy.resolve_conflict(existing, entity)
                if conflict_action == ConflictAction.SUPERSEDE_OLD:
                    return MemoryDecision(
                        outcome=DecisionOutcome.UPDATE_EXISTING,
                        candidate=entity,
                        target_memory_id=existing.metadata.memory_id,
                        reason=f"Supersedes existing memory: {conflict_reason}",
                        decision_confidence=0.90,
                    )

        # 4. Default Outcome: Create New Memory
        return MemoryDecision(
            outcome=DecisionOutcome.CREATE_NEW,
            candidate=entity,
            reason="Candidate validated cleanly as a new persistent memory item.",
            decision_confidence=entity.metadata.confidence,
        )

    def evaluate_batch(
        self,
        candidates: List[ExtractionCandidate | MemoryEntity],
        existing_memories: Optional[List[MemoryEntity]] = None,
    ) -> List[MemoryDecision]:
        """Evaluate a batch of candidate memories."""
        return [
            self.evaluate_candidate(cand, existing_memories=existing_memories)
            for cand in candidates
        ]
