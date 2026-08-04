"""
Memory Index Engine Subsystem
Prepares multi-dimensional structured lookup indices over stored MemoryEntities for fast retrieval readiness.
Organizes memory metadata across Time, Category, Emotion, Goal, Relationship, Preference, Topic, and Importance.
Contains zero retrieval, zero ranking formulas, zero prompt construction, and zero LLM calls.
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple

from modules.memory.domain import (
    MemoryCategory,
    MemoryEntity,
    MemoryKind,
    MemoryStatus,
)


class IndexDimension(str, Enum):
    TIME = "time"
    CATEGORY = "category"
    EMOTION = "emotion"
    GOAL = "goal"
    RELATIONSHIP = "relationship"
    PREFERENCE = "preference"
    TOPIC = "topic"
    IMPORTANCE = "importance"


@dataclass
class MemoryIndexEntry:
    """
    Structured index record exposing rich retrieval signals for a single MemoryEntity.
    Enables instant multi-dimensional lookup without full table scans.
    """
    memory_id: int
    user_id: int
    category: MemoryCategory
    timestamp: datetime
    is_active: bool
    importance: float
    confidence: float
    version: int
    access_count: int
    emotion_tags: List[str] = field(default_factory=list)
    topic_tags: List[str] = field(default_factory=list)
    dimensions: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_domain_entity(cls, entity: MemoryEntity) -> "MemoryIndexEntry":
        """Construct a structured index entry from a MemoryEntity."""
        mem_id = entity.metadata.memory_id or 0
        usr_id = entity.metadata.user_id or 0

        # Extract topic tags from keywords in content
        content_lower = entity.content.lower()
        topic_tags: List[str] = []
        for term in ["work", "anxiety", "brother", "family", "sleep", "job", "stress", "routine"]:
            if term in content_lower:
                topic_tags.append(term)

        # Extract emotion tags from extra metadata if present
        emotion_tags: List[str] = entity.metadata.extra.get("emotion_tags", [])

        # Categorize importance bucket
        importance_bucket = "high" if entity.metadata.importance >= 0.8 else ("medium" if entity.metadata.importance >= 0.5 else "low")

        dimensions_map: Dict[str, Any] = {
            IndexDimension.TIME.value: entity.metadata.created_at.isoformat(),
            IndexDimension.CATEGORY.value: entity.metadata.category.value,
            IndexDimension.EMOTION.value: emotion_tags,
            IndexDimension.GOAL.value: "completed" if entity.metadata.status == MemoryStatus.COMPLETED else ("active" if entity.metadata.is_active else "inactive"),
            IndexDimension.RELATIONSHIP.value: [tag for tag in topic_tags if tag in ["brother", "family"]],
            IndexDimension.PREFERENCE.value: entity.metadata.category == MemoryCategory.PREFERENCE,
            IndexDimension.TOPIC.value: topic_tags,
            IndexDimension.IMPORTANCE.value: importance_bucket,
        }

        return cls(
            memory_id=mem_id,
            user_id=usr_id,
            category=entity.metadata.category,
            timestamp=entity.metadata.created_at,
            is_active=entity.metadata.is_active,
            importance=entity.metadata.importance,
            confidence=entity.metadata.confidence,
            version=entity.metadata.version,
            access_count=entity.metadata.access_count,
            emotion_tags=emotion_tags,
            topic_tags=topic_tags,
            dimensions=dimensions_map,
        )


class MemoryIndexEngine:
    """
    Pure Memory Index Engine.
    Organizes stored memories into multi-dimensional lookup indices.
    Supports incremental index maintenance (Create, Update, Supersede, Archive, Complete).
    """

    def __init__(self):
        # In-memory index structures keyed by User ID
        self._user_indices: Dict[int, Dict[int, MemoryIndexEntry]] = {}
        self._category_indices: Dict[int, Dict[MemoryCategory, Set[int]]] = {}
        self._importance_indices: Dict[int, Dict[str, Set[int]]] = {}

    # ── Index Construction & Entry Generation ──────────────────────────────

    def build_index_entry(self, entity: MemoryEntity) -> MemoryIndexEntry:
        """Exposes public interface to generate a MemoryIndexEntry from MemoryEntity."""
        return MemoryIndexEntry.from_domain_entity(entity)

    def index_memory(self, entity: MemoryEntity) -> MemoryIndexEntry:
        """
        Incrementally index a MemoryEntity into all active dimensions.
        """
        entry = self.build_index_entry(entity)
        usr_id = entry.user_id
        mem_id = entry.memory_id

        if usr_id not in self._user_indices:
            self._user_indices[usr_id] = {}
            self._category_indices[usr_id] = {}
            self._importance_indices[usr_id] = {"high": set(), "medium": set(), "low": set()}

        # 1. Primary Entry Map
        self._user_indices[usr_id][mem_id] = entry

        # 2. Category Dimension Index
        cat = entry.category
        if cat not in self._category_indices[usr_id]:
            self._category_indices[usr_id][cat] = set()
        self._category_indices[usr_id][cat].add(mem_id)

        # 3. Importance Dimension Index
        bucket = entry.dimensions.get(IndexDimension.IMPORTANCE.value, "medium")
        self._importance_indices[usr_id][bucket].add(mem_id)

        # 4. Trigger Vector & Cache Extension Point Hooks
        self._vector_embedding_index_stub(entry)
        self._cache_layer_index_stub(entry)

        return entry

    # ── Incremental Index Maintenance Hooks ─────────────────────────────────

    def on_memory_created(self, entity: MemoryEntity) -> MemoryIndexEntry:
        """Hook called when a new memory entity is created."""
        return self.index_memory(entity)

    def on_memory_updated(self, entity: MemoryEntity) -> MemoryIndexEntry:
        """Hook called when an existing memory entity is updated."""
        return self.index_memory(entity)

    def on_memory_superseded(
        self, old_entity: MemoryEntity, new_entity: MemoryEntity
    ) -> Tuple[MemoryIndexEntry, MemoryIndexEntry]:
        """Hook called when an old memory entity is superseded by a new entity."""
        old_entry = self.index_memory(old_entity)
        new_entry = self.index_memory(new_entity)
        return old_entry, new_entry

    def on_memory_archived(self, entity: MemoryEntity) -> MemoryIndexEntry:
        """Hook called when a memory entity is archived."""
        entity.metadata.is_active = False
        return self.index_memory(entity)

    def on_memory_completed(self, entity: MemoryEntity) -> MemoryIndexEntry:
        """Hook called when a goal memory entity is completed."""
        entity.metadata.is_active = False
        return self.index_memory(entity)

    def remove_from_indices(self, user_id: int, memory_id: int) -> bool:
        """Remove a memory ID from active index structures."""
        if user_id in self._user_indices and memory_id in self._user_indices[user_id]:
            entry = self._user_indices[user_id].pop(memory_id)
            cat = entry.category
            if cat in self._category_indices.get(user_id, {}):
                self._category_indices[user_id][cat].discard(memory_id)
            return True
        return False

    def get_indexed_entry(self, user_id: int, memory_id: int) -> Optional[MemoryIndexEntry]:
        """Retrieve an indexed entry by user ID and memory ID."""
        return self._user_indices.get(user_id, {}).get(memory_id)

    def search_candidates(self, user_id: int, query_terms: List[str]) -> List[int]:
        """
        Pre-filter candidate memory IDs for a user based on query terms matching active indexed dimensions.
        Returns matching memory IDs to avoid full database scans.
        """
        user_entries = self._user_indices.get(user_id, {})
        if not user_entries:
            return []

        recall_intent_words = {"remember", "recall", "know", "about", "tell", "what", "who", "girl", "person", "goal", "favourite", "favorite", "color", "colour"}
        is_recall_query = any(term in recall_intent_words for term in query_terms)

        matched_ids: List[int] = []
        for mem_id, entry in user_entries.items():
            if not entry.is_active:
                continue

            if not query_terms or is_recall_query:
                matched_ids.append(mem_id)
                continue

            # Match against topic tags, dimensions, or category
            entry_topics = set(entry.topic_tags)
            if any(term in entry_topics for term in query_terms):
                matched_ids.append(mem_id)
            elif any(term in str(entry.dimensions).lower() for term in query_terms):
                matched_ids.append(mem_id)

        return matched_ids

    # ── Extension Point Hooks (Stubs for Future Vector & Graph Search) ──────

    def _vector_embedding_index_stub(self, entry: MemoryIndexEntry) -> None:
        """Extension Point Stub: Hook for future ChromaDB vector embedding index update."""
        pass

    def _hybrid_search_index_stub(self, entry: MemoryIndexEntry) -> None:
        """Extension Point Stub: Hook for future BM25 + Vector hybrid indexer."""
        pass

    def _cache_layer_index_stub(self, entry: MemoryIndexEntry) -> None:
        """Extension Point Stub: Hook for future Redis memory cache warming."""
        pass

    def _graph_index_stub(self, entry: MemoryIndexEntry) -> None:
        """Extension Point Stub: Hook for future Knowledge Graph entity relationship nodes."""
        pass


# Global singleton instance for memory indexing across API calls
index_engine = MemoryIndexEngine()

