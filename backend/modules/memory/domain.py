"""
Memory Domain Model
Canonical representation of Memory within the Maitri System.
Defines entity representations, enums, metadata structures, and conversion utilities.
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional


class MemoryKind(str, Enum):
    SHORT_TERM = "short_term"   # Transient session working memory
    EPISODIC = "episodic"       # Temporal event summaries & session notes
    LONG_TERM = "long_term"     # Permanent user facts, beliefs, traits, & goals


class MemoryCategory(str, Enum):
    FACT = "fact"                 # Specific objective user detail (e.g., "Works as a software engineer")
    PREFERENCE = "preference"     # Stated preference (e.g., "Prefers morning sessions")
    GOAL = "goal"                 # Explicit user target (e.g., "Reduce work anxiety")
    RELATIONSHIP = "relationship" # Social node details (e.g., "Brother named Rahul")
    TRAIT = "trait"               # Observed psychological trait (e.g., "High emotional self-awareness")
    HABIT = "habit"               # Behavioral routine (e.g., "Goes to gym 4 days a week")
    TRIGGER = "trigger"           # Specific stress trigger (e.g., "Panic triggered by tight deadlines")
    EPISODE = "episode"           # Narrative session summary
    REFLECTION = "reflection"     # Internal breakthrough realization


class MemoryStatus(str, Enum):
    OBSERVED = "observed"           # Raw turn signal detected
    CANDIDATE = "candidate"         # Extracted, awaiting validation
    VALIDATED = "validated"         # Passed quality & confidence checks
    STORED = "stored"               # Persisted in memory store
    RETRIEVED = "retrieved"         # Active in current context assembly
    UPDATED = "updated"             # Modified by newer information
    SUPERSEDED = "superseded"       # Historical version replaced by newer memory
    COMPLETED = "completed"         # Goal or action marked completed
    ARCHIVED = "archived"           # Soft-deleted / non-vector indexed
    FORGOTTEN = "forgotten"         # Permanently purged / expired


class MemorySource(str, Enum):
    ONBOARDING = "onboarding"
    DIRECT_USER_STATEMENT = "direct_user_statement"
    ASSESSOR_INFERENCE = "assessor_inference"
    SESSION_SUMMARY = "session_summary"
    SYSTEM_PROMOTION = "system_promotion"


class ConflictAction(str, Enum):
    PRESERVE_BOTH = "preserve_both"
    SUPERSEDE_OLD = "supersede_old"
    REJECT_NEW = "reject_new"
    MERGE_ATTRIBUTES = "merge_attributes"
    PENDING_VERIFICATION = "pending_verification"


@dataclass
class MemoryMetadata:
    """Complete metadata associated with a memory entity."""
    memory_id: Optional[int] = None
    user_id: Optional[int] = None
    memory_kind: MemoryKind = MemoryKind.LONG_TERM
    category: MemoryCategory = MemoryCategory.FACT
    importance: float = 0.5            # 0.0 (Low) to 1.0 (Critical)
    confidence: float = 1.0            # Extraction confidence score
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    last_accessed_at: Optional[datetime] = None
    access_count: int = 0
    source: MemorySource = MemorySource.DIRECT_USER_STATEMENT
    origin_session: Optional[int] = None
    embedding_reference: Optional[str] = None
    status: MemoryStatus = MemoryStatus.STORED
    is_active: bool = True
    version: int = 1
    supersedes_id: Optional[int] = None
    superseded_by_id: Optional[int] = None
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MemoryEntity:
    """
    Canonical Memory Domain Entity.
    Acts as the single source of truth for all memory operations across the system.
    """
    content: str
    metadata: MemoryMetadata

    def touch_access(self) -> None:
        """Record an access event during memory retrieval."""
        self.metadata.last_accessed_at = datetime.utcnow()
        self.metadata.access_count += 1
        self.metadata.status = MemoryStatus.RETRIEVED

    def promote_status(self, new_status: MemoryStatus) -> None:
        """Promote memory through its lifecycle stages."""
        self.metadata.status = new_status
        self.metadata.updated_at = datetime.utcnow()

    @property
    def is_valid_for_retrieval(self) -> bool:
        """Check if memory is eligible for prompt context injection."""
        return (
            self.metadata.status in (MemoryStatus.STORED, MemoryStatus.RETRIEVED, MemoryStatus.VALIDATED)
            and self.metadata.confidence >= 0.70
        )

    def to_orm_dict(self) -> Dict[str, Any]:
        """Convert domain entity to dictionary format matching SQL companion_memories schema."""
        active_str = "active" if self.metadata.is_active else "inactive"
        sup_str = f":sup{self.metadata.supersedes_id}" if self.metadata.supersedes_id else ""
        type_encoded = f"{self.metadata.memory_kind.value}:{self.metadata.category.value}:v{self.metadata.version}:{self.metadata.status.value}:{active_str}{sup_str}"

        return {
            "id": self.metadata.memory_id,
            "user_id": self.metadata.user_id,
            "memory_type": type_encoded,
            "content": self.content,
            "importance_score": self.metadata.importance,
            "created_at": self.metadata.created_at,
            "updated_at": self.metadata.updated_at,
        }

    @classmethod
    def from_orm_model(cls, instance: Any) -> "MemoryEntity":
        """Reconstruct domain entity from an ORM CompanionMemory model instance."""
        mem_type_raw = getattr(instance, "memory_type", "long_term:fact")
        parts = mem_type_raw.split(":")
        
        kind_str = parts[0] if parts[0] in [k.value for k in MemoryKind] else "long_term"
        cat_str = parts[1] if len(parts) > 1 and parts[1] in [c.value for c in MemoryCategory] else "fact"

        version = 1
        status = MemoryStatus.STORED
        is_active = True
        supersedes_id = None

        if len(parts) > 2 and parts[2].startswith("v"):
            try:
                version = int(parts[2][1:])
            except ValueError:
                version = 1

        if len(parts) > 3 and parts[3] in [s.value for s in MemoryStatus]:
            status = MemoryStatus(parts[3])

        if len(parts) > 4:
            is_active = (parts[4] == "active")

        if len(parts) > 5 and parts[5].startswith("sup"):
            try:
                supersedes_id = int(parts[5][3:])
            except ValueError:
                supersedes_id = None

        metadata = MemoryMetadata(
            memory_id=getattr(instance, "id", None),
            user_id=getattr(instance, "user_id", None),
            memory_kind=MemoryKind(kind_str),
            category=MemoryCategory(cat_str),
            importance=getattr(instance, "importance_score", 0.5),
            confidence=1.0,
            created_at=getattr(instance, "created_at", datetime.utcnow()),
            updated_at=getattr(instance, "updated_at", datetime.utcnow()),
            status=status,
            is_active=is_active,
            version=version,
            supersedes_id=supersedes_id,
        )
        return cls(content=getattr(instance, "content", ""), metadata=metadata)
