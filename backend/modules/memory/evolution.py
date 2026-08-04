"""
Memory Evolution Engine Subsystem
Responsible for evaluating how existing memories change over time.
Controls memory state transitions (Active, Updated, Archived, Superseded, Completed, Merged),
versioning lineages, and exclusivity semantics for single-active category domains.
Contains zero retrieval, zero prompt construction, and zero LLM calls.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple

from modules.memory.domain import (
    ConflictAction,
    MemoryCategory,
    MemoryEntity,
    MemoryKind,
    MemoryStatus,
)
from modules.memory.policies import MemoryConflictPolicy


class EvolutionTransition(str, Enum):
    REMAIN_ACTIVE = "remain_active"
    SUPERSEDE = "supersede"
    MARK_COMPLETED = "mark_completed"
    MERGE = "merge"
    ARCHIVE = "archive"


@dataclass
class EvolutionResult:
    """
    Result emitted by MemoryEvolutionEngine specifying state transitions,
    version references, and active exclusivity updates.
    """
    transition: EvolutionTransition
    candidate: MemoryEntity
    target_existing: Optional[MemoryEntity] = None
    version_chain: Dict[str, Any] = field(default_factory=dict)
    reason: str = ""


class MemoryEvolutionEngine:
    """
    Pure Memory Evolution Engine.
    Determines memory state transitions, versioning links, and active exclusivity semantics.
    """

    # Categories requiring strict single-active exclusivity per subject key
    EXCLUSIVE_CATEGORIES: Set[MemoryCategory] = {
        MemoryCategory.GOAL,          # Active goal state (completed goals transition out)
        MemoryCategory.RELATIONSHIP,  # Active relationship status
        MemoryCategory.PREFERENCE,    # Active preferences
        MemoryCategory.FACT,          # Single active fact attributes (e.g. current location/job)
    }

    def evaluate_evolution(
        self,
        candidate: MemoryEntity,
        existing_memories: List[MemoryEntity],
    ) -> EvolutionResult:
        """
        Evaluate candidate entity against existing user memory state to determine evolution transition.
        """
        if not existing_memories:
            return EvolutionResult(
                transition=EvolutionTransition.REMAIN_ACTIVE,
                candidate=candidate,
                reason="No prior existing memories; candidate established as new active memory.",
            )

        cand_content_lower = candidate.content.strip().lower()

        # 1. Check for Goal Completion / Action Fulfillment Transition
        if candidate.metadata.category == MemoryCategory.GOAL:
            for existing in existing_memories:
                if existing.metadata.category == MemoryCategory.GOAL and existing.metadata.is_active:
                    # If candidate states goal achieved/completed
                    if any(term in cand_content_lower for term in ["completed", "achieved", "finished", "done"]):
                        existing.metadata.status = MemoryStatus.COMPLETED
                        existing.metadata.is_active = False
                        return EvolutionResult(
                            transition=EvolutionTransition.MARK_COMPLETED,
                            candidate=candidate,
                            target_existing=existing,
                            version_chain={"completed_goal_id": existing.metadata.memory_id},
                            reason="Candidate signals completion of active user goal.",
                        )

        # 2. Check for Superseding / Exclusivity Updates
        for existing in existing_memories:
            if not existing.metadata.is_active:
                continue

            # Check conflict policy resolution
            conflict_action, conflict_reason = MemoryConflictPolicy.resolve_conflict(existing, candidate)
            if conflict_action == ConflictAction.SUPERSEDE_OLD:
                # Execute Versioning Linkage
                candidate.metadata.version = existing.metadata.version + 1
                candidate.metadata.supersedes_id = existing.metadata.memory_id
                
                existing.metadata.status = MemoryStatus.SUPERSEDED
                existing.metadata.is_active = False
                existing.metadata.superseded_by_id = candidate.metadata.memory_id

                return EvolutionResult(
                    transition=EvolutionTransition.SUPERSEDE,
                    candidate=candidate,
                    target_existing=existing,
                    version_chain={
                        "old_id": existing.metadata.memory_id,
                        "new_version": candidate.metadata.version,
                    },
                    reason=f"Supersedes historical memory (v{existing.metadata.version}): {conflict_reason}",
                )

            # Check exact content match for Merging
            if existing.content.strip().lower() == cand_content_lower:
                existing.touch_access()
                return EvolutionResult(
                    transition=EvolutionTransition.MERGE,
                    candidate=candidate,
                    target_existing=existing,
                    reason="Identical content detected; merged access count and timestamp.",
                )

        # 3. Default Transition: Remain Active as distinct memory item
        return EvolutionResult(
            transition=EvolutionTransition.REMAIN_ACTIVE,
            candidate=candidate,
            reason="Candidate is distinct and complementary; added to active memory set.",
        )

    # ── Future Evolution Extension Point Hooks (Stubs) ──────────────────────────

    def apply_temporal_decay_stub(
        self, entity: MemoryEntity, elapsed_days: float
    ) -> float:
        """
        Extension Point Stub: Future temporal weighting and recency decay.
        Calculates adjusted importance based on age and access count.
        """
        decay_factor = max(0.1, 1.0 - (elapsed_days * 0.01))
        return entity.metadata.importance * decay_factor

    def apply_confidence_decay_stub(
        self, entity: MemoryEntity, unverified_turns: int
    ) -> float:
        """
        Extension Point Stub: Future confidence decay for unverified inferences.
        """
        return max(0.2, entity.metadata.confidence - (unverified_turns * 0.05))

    def apply_aging_consolidation_stub(
        self, entity: MemoryEntity, age_threshold_days: float = 30.0
    ) -> bool:
        """
        Extension Point Stub: Future memory aging & consolidation candidate selection.
        """
        return entity.metadata.access_count == 0 and entity.metadata.status == MemoryStatus.STORED
