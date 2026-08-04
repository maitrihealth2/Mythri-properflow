"""
Memory Domain Policies
Pure domain rules for memory quality validation, conflict resolution, and lifecycle state transitions.
"""
from typing import Set, Tuple
from modules.memory.domain import (
    ConflictAction,
    MemoryEntity,
    MemorySource,
    MemoryStatus,
)


class MemoryQualityPolicy:
    """
    Pure domain rules governing whether candidate text qualifies to become persistent memory.
    Filters out small talk, trivial greetings, short filler, and assistant assumptions.
    """

    GREETING_PATTERNS: Set[str] = {
        "hi", "hello", "hey", "yo", "sup", "good morning", "good night", "hola", "bye"
    }

    TRIVIAL_FILLER: Set[str] = {
        "ok", "okay", "fine", "yeah", "cool", "alright", "hmm", "k", "yep", "yes", "no", "nah", "idk"
    }

    MIN_CHARACTER_LENGTH: int = 12
    MIN_WORD_COUNT: int = 3

    @classmethod
    def should_extract(cls, user_message: str) -> bool:
        """Evaluate if user turn contains meaningful informational content worth extracting."""
        msg = user_message.strip().lower()
        words = msg.split()

        # Filter out short filler / trivial responses
        if len(words) < cls.MIN_WORD_COUNT or len(msg) < cls.MIN_CHARACTER_LENGTH:
            return False

        # Filter out isolated greetings
        if len(words) <= 4 and any(g in msg for g in cls.GREETING_PATTERNS):
            return False

        # Filter out pure filler phrases
        if len(words) <= 2 and msg in cls.TRIVIAL_FILLER:
            return False

        return True

    @classmethod
    def validate_candidate(cls, entity: MemoryEntity) -> bool:
        """Validate an extracted candidate memory against quality thresholds."""
        if not entity.content or len(entity.content.strip()) < cls.MIN_CHARACTER_LENGTH:
            return False
        if entity.metadata.confidence < 0.70:
            return False
        return True


class MemoryConflictPolicy:
    """
    Pure domain rules for detecting and resolving conflicts between existing and new memories.
    """

    @classmethod
    def resolve_conflict(
        self, existing: MemoryEntity, new: MemoryEntity
    ) -> Tuple[ConflictAction, str]:
        """
        Determine conflict resolution strategy between an existing memory and a new candidate memory.
        """
        # Rule 1: Direct User Statements take precedence over Assessor Inferences
        if (
            new.metadata.source == MemorySource.DIRECT_USER_STATEMENT
            and existing.metadata.source == MemorySource.ASSESSOR_INFERENCE
        ):
            return (ConflictAction.SUPERSEDE_OLD, "Direct user statement overrides inferred fact.")

        # Rule 2: Newer validated memory of same category supersedes older memory in exclusive category
        if (
            new.metadata.category == existing.metadata.category
            and new.metadata.confidence >= existing.metadata.confidence
            and new.metadata.created_at >= existing.metadata.created_at
            and new.content.strip().lower() != existing.content.strip().lower()
        ):
            return (ConflictAction.SUPERSEDE_OLD, "Newer validated memory supersedes existing record of same category.")

        # Rule 3: If contents match, update access timestamp without creating duplicate
        if existing.content.strip().lower() == new.content.strip().lower():
            return (ConflictAction.MERGE_ATTRIBUTES, "Identical content detected; merge timestamps.")

        # Default fallback
        return (ConflictAction.PRESERVE_BOTH, "Distinct non-conflicting memories preserved.")


class MemoryLifecyclePolicy:
    """
    Pure domain rules governing legal state transitions for a MemoryEntity.
    """

    LEGAL_TRANSITIONS = {
        MemoryStatus.OBSERVED: {MemoryStatus.CANDIDATE, MemoryStatus.FORGOTTEN},
        MemoryStatus.CANDIDATE: {MemoryStatus.VALIDATED, MemoryStatus.FORGOTTEN},
        MemoryStatus.VALIDATED: {MemoryStatus.STORED, MemoryStatus.ARCHIVED},
        MemoryStatus.STORED: {MemoryStatus.RETRIEVED, MemoryStatus.UPDATED, MemoryStatus.ARCHIVED},
        MemoryStatus.RETRIEVED: {MemoryStatus.STORED, MemoryStatus.UPDATED, MemoryStatus.ARCHIVED},
        MemoryStatus.UPDATED: {MemoryStatus.STORED, MemoryStatus.ARCHIVED},
        MemoryStatus.ARCHIVED: {MemoryStatus.FORGOTTEN, MemoryStatus.STORED},
        MemoryStatus.FORGOTTEN: set(),
    }

    @classmethod
    def can_transition(cls, current_status: MemoryStatus, target_status: MemoryStatus) -> bool:
        """Check if transitioning from current_status to target_status is valid."""
        allowed = cls.LEGAL_TRANSITIONS.get(current_status, set())
        return target_status in allowed
