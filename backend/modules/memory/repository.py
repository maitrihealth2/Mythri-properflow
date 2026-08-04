"""
Memory Repository Subsystem
Pure persistence abstraction layer for memory operations.
Interacts with the SQL persistence layer (CompanionMemory ORM model) and exposes vector/cache extension points.
Accepts and returns canonical MemoryEntity domain objects only.
"""
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from core.database.models import CompanionMemory
from modules.memory.contracts import MemoryStoreProtocol
from modules.memory.domain import (
    MemoryEntity,
    MemoryKind,
    MemoryMetadata,
    MemoryStatus,
)
from modules.memory.types import MemoryItem, MemoryType


class MemoryRepository(MemoryStoreProtocol):
    """
    Production Memory Repository implementation.
    Isolates all low-level SQL database and vector indexing access.
    Exposes zero business, extraction, or ranking logic.
    """

    def __init__(self, db_session: Session):
        self.db = db_session

    # ── Domain Object Persistence API ──────────────────────────────────────

    def save_memory(self, entity: MemoryEntity) -> MemoryEntity:
        """
        Persist a new MemoryEntity into the companion_memories table.
        Converts MemoryEntity to ORM representation and back.
        """
        orm_data = entity.to_orm_dict()
        
        # Omit ID on insert so database assigns primary key
        if "id" in orm_data:
            del orm_data["id"]

        db_model = CompanionMemory(**orm_data)
        self.db.add(db_model)
        self.db.commit()
        self.db.refresh(db_model)

        # Vector Store Extension Point Hook (Stub for future vector indexer)
        self._index_vector_stub(db_model.id, entity.content, entity.metadata.user_id)

        return MemoryEntity.from_orm_model(db_model)

    def get_memory_by_id(self, memory_id: int) -> Optional[MemoryEntity]:
        """Fetch a single memory record by primary key ID and return as MemoryEntity."""
        db_model = (
            self.db.query(CompanionMemory)
            .filter(CompanionMemory.id == memory_id)
            .first()
        )
        if not db_model:
            return None
        return MemoryEntity.from_orm_model(db_model)

    def get_memories_by_user(
        self,
        user_id: int,
        limit: int = 50,
        memory_kind: Optional[MemoryKind] = None,
    ) -> List[MemoryEntity]:
        """
        Fetch all memories belonging to a specific user.
        Optionally filters by MemoryKind prefix (e.g. 'long_term').
        """
        query = self.db.query(CompanionMemory).filter(CompanionMemory.user_id == user_id)

        if memory_kind:
            prefix = f"{memory_kind.value}:"
            query = query.filter(CompanionMemory.memory_type.like(f"{prefix}%"))

        results = query.order_by(CompanionMemory.created_at.desc()).limit(limit).all()
        return [MemoryEntity.from_orm_model(item) for item in results]

    def update_memory(self, entity: MemoryEntity) -> MemoryEntity:
        """Update an existing memory record in companion_memories."""
        if not entity.metadata.memory_id:
            raise ValueError("Cannot update MemoryEntity without a valid memory_id")

        db_model = (
            self.db.query(CompanionMemory)
            .filter(CompanionMemory.id == entity.metadata.memory_id)
            .first()
        )
        if not db_model:
            raise KeyError(f"Memory with ID {entity.metadata.memory_id} not found")

        orm_data = entity.to_orm_dict()
        db_model.content = orm_data["content"]
        db_model.memory_type = orm_data["memory_type"]
        db_model.importance_score = orm_data["importance_score"]
        db_model.updated_at = entity.metadata.updated_at

        self.db.commit()
        self.db.refresh(db_model)
        return MemoryEntity.from_orm_model(db_model)

    def delete_memory(self, memory_id: int) -> bool:
        """Permanently delete a memory record from companion_memories."""
        db_model = (
            self.db.query(CompanionMemory)
            .filter(CompanionMemory.id == memory_id)
            .first()
        )
        if not db_model:
            return False

        self.db.delete(db_model)
        self.db.commit()

        # Vector Purge Extension Point Hook
        self._purge_vector_stub(memory_id)
        return True

    def archive_memory(self, memory_id: int) -> bool:
        """
        Soft-archive a memory record by reducing its importance score.
        Excludes it from active context while retaining historical trace.
        """
        entity = self.get_memory_by_id(memory_id)
        if not entity:
            return False

        entity.promote_status(MemoryStatus.ARCHIVED)
        entity.metadata.importance = 0.0
        self.update_memory(entity)
        return True

    # ── MemoryStoreProtocol Interface Adapter ─────────────────────────────

    def save_item(self, item: MemoryItem) -> MemoryItem:
        """Fulfills MemoryStoreProtocol using foundation MemoryItem struct."""
        metadata = MemoryMetadata(
            memory_id=item.id,
            user_id=item.user_id,
            memory_kind=MemoryKind(item.memory_type.value) if item.memory_type else MemoryKind.LONG_TERM,
            importance=item.importance_score,
            confidence=item.confidence_score,
        )
        entity = MemoryEntity(content=item.content, metadata=metadata)
        saved_entity = self.save_memory(entity)

        return MemoryItem(
            id=saved_entity.metadata.memory_id,
            user_id=saved_entity.metadata.user_id,
            memory_type=item.memory_type,
            category=item.category,
            content=saved_entity.content,
            importance_score=saved_entity.metadata.importance,
            confidence_score=saved_entity.metadata.confidence,
            created_at=saved_entity.metadata.created_at,
            updated_at=saved_entity.metadata.updated_at,
        )

    def get_item(self, memory_id: int) -> Optional[MemoryItem]:
        """Fulfills MemoryStoreProtocol get_item."""
        entity = self.get_memory_by_id(memory_id)
        if not entity:
            return None
        return MemoryItem(
            id=entity.metadata.memory_id,
            user_id=entity.metadata.user_id,
            content=entity.content,
            importance_score=entity.metadata.importance,
        )

    def query_items(
        self,
        user_id: int,
        memory_type: Optional[MemoryType] = None,
        limit: int = 10,
    ) -> List[MemoryItem]:
        """Fulfills MemoryStoreProtocol query_items."""
        kind = MemoryKind(memory_type.value) if memory_type else None
        entities = self.get_memories_by_user(user_id, limit=limit, memory_kind=kind)
        return [
            MemoryItem(
                id=e.metadata.memory_id,
                user_id=e.metadata.user_id,
                content=e.content,
                importance_score=e.metadata.importance,
            )
            for e in entities
        ]

    def delete_item(self, memory_id: int) -> bool:
        """Fulfills MemoryStoreProtocol delete_item."""
        return self.delete_memory(memory_id)

    # ── Extension Point Hooks (Stubs for Future Vector Store / Cache) ──────

    def _index_vector_stub(self, memory_id: int, content: str, user_id: Optional[int]) -> None:
        """Extension Point: Hook for future ChromaDB vector embedding indexer."""
        pass

    def _purge_vector_stub(self, memory_id: int) -> None:
        """Extension Point: Hook for future ChromaDB vector deletion."""
        pass
