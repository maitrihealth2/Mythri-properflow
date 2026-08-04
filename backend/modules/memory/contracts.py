"""
Memory System Interfaces & Contracts
Defines abstract protocols for memory storage, retrieval, extraction, ranking, and lifecycle.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from modules.memory.types import (
    MemoryContext,
    MemoryEvent,
    MemoryItem,
    MemoryQueryResult,
    MemoryType,
)


class MemoryStoreProtocol(ABC):
    """Protocol for persisting and fetching memory records."""

    @abstractmethod
    def save_item(self, item: MemoryItem) -> MemoryItem:
        """Persist a single memory item."""
        pass

    @abstractmethod
    def get_item(self, memory_id: int) -> Optional[MemoryItem]:
        """Fetch a memory item by ID."""
        pass

    @abstractmethod
    def query_items(
        self,
        user_id: int,
        memory_type: Optional[MemoryType] = None,
        limit: int = 10,
    ) -> List[MemoryItem]:
        """Query memory items matching filter criteria."""
        pass

    @abstractmethod
    def delete_item(self, memory_id: int) -> bool:
        """Soft-delete or purge a memory record."""
        pass


class MemoryRetrieverProtocol(ABC):
    """Protocol for searching and context assembly."""

    @abstractmethod
    def retrieve_context(
        self, user_id: int, query: str, limit: int = 5
    ) -> MemoryQueryResult:
        """Retrieve relevant memories for a user turn."""
        pass


class MemoryExtractorProtocol(ABC):
    """Protocol for distilling structured memories from dialogue turns."""

    @abstractmethod
    def extract_memories(
        self, user_id: int, user_message: str, assistant_response: str
    ) -> List[MemoryItem]:
        """Extract candidate memory facts from turn exchange."""
        pass


class MemoryRankingProtocol(ABC):
    """Protocol for scoring and sorting candidate memories."""

    @abstractmethod
    def rank_memories(
        self, query: str, candidates: List[MemoryItem]
    ) -> List[MemoryItem]:
        """Rank candidate memories by composite relevance score."""
        pass


class MemoryLifecycleProtocol(ABC):
    """Protocol for consolidation, decay, and maintenance."""

    @abstractmethod
    def consolidate_session(self, user_id: int, session_id: int) -> bool:
        """Synthesize session turns into episodic memories."""
        pass

    @abstractmethod
    def apply_decay(self, user_id: int) -> int:
        """Apply temporal decay calculations to user memories."""
        pass
