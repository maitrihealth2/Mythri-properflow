"""
Memory Manager Subsystem
Thin orchestration layer coordinating execution between MemoryPipeline and MemoryRepository.
Contains zero business rules, zero persistence logic, and zero retrieval logic.
Consumes PipelineResult and executes decisions using MemoryRepository exclusively.
"""
from typing import Any, List, Optional
from sqlalchemy.orm import Session

from modules.memory.decision import (
    DecisionOutcome,
    MemoryDecision,
    MemoryDecisionEngine,
)
from modules.memory.domain import MemoryEntity
from modules.memory.events import MemoryEventDispatcher
from modules.memory.extractor import MemoryExtractor
from modules.memory.pipeline import MemoryPipeline, PipelineResult
from modules.memory.repository import MemoryRepository
from modules.memory.types import (
    MemoryContext,
    MemoryEvent,
    MemoryEventType,
)


class MemoryManager:
    """
    Orchestration service for the Mythri Memory System.
    Consumes PipelineResult from MemoryPipeline and executes decisions via MemoryRepository.
    Delegates all stage decisions to Decision Engine and persistence to MemoryRepository.
    """

    def __init__(
        self,
        repository: Optional[Any] = None,
        pipeline: Optional[MemoryPipeline] = None,
        dispatcher: Optional[MemoryEventDispatcher] = None,
        db_session: Optional[Session] = None,
    ):
        if isinstance(repository, Session):
            self.repository = MemoryRepository(repository)
        elif repository is None and db_session is not None:
            self.repository = MemoryRepository(db_session)
        else:
            self.repository = repository

        self.pipeline = pipeline or MemoryPipeline()
        self.dispatcher = dispatcher or MemoryEventDispatcher()

    # ── Primary Orchestration Execution ─────────────────────────────────────

    def process_turn(
        self,
        user_id: int,
        user_message: str,
        session_id: Optional[int] = None,
        existing_memories: Optional[List[MemoryEntity]] = None,
    ) -> PipelineResult:
        """
        Orchestrates pipeline execution and decision execution routing.
        Flow: Input -> MemoryPipeline.run() -> PipelineResult -> Manager (Execution Routing) -> Repository -> Persistence
        """
        # Fetch existing memories from repository if available to pass to pipeline
        if existing_memories is None and self.repository:
            try:
                existing_memories = self.repository.get_memories_by_user(user_id=user_id, limit=50)
            except Exception as e:
                print(f"[MemoryManager] Note: Could not fetch existing memories for pipeline: {e}")
                existing_memories = []

        # Step 1: Execute MemoryPipeline stages
        result: PipelineResult = self.pipeline.run(
            user_id=user_id,
            user_message=user_message,
            session_id=session_id,
            existing_memories=existing_memories,
        )

        # Step 2: Execute Decisions produced by the pipeline
        for decision in result.decisions:
            self._execute_decision(decision)

        return result

    def _execute_decision(self, decision: MemoryDecision) -> None:
        """
        Execute a single MemoryDecision using MemoryRepository exclusively.
        Contains zero decision logic; executes outcome cleanly.
        """
        if not self.repository or not decision.is_actionable:
            return

        try:
            if decision.outcome == DecisionOutcome.CREATE_NEW:
                saved_entity = self.repository.save_memory(decision.candidate)
                decision.candidate.metadata.memory_id = saved_entity.metadata.memory_id

            elif decision.outcome == DecisionOutcome.UPDATE_EXISTING:
                if decision.target_memory_id:
                    decision.candidate.metadata.memory_id = decision.target_memory_id
                    self.repository.update_memory(decision.candidate)

            elif decision.outcome == DecisionOutcome.MERGE_INTO_EXISTING:
                if decision.target_memory_id:
                    existing = self.repository.get_memory_by_id(decision.target_memory_id)
                    if existing:
                        existing.touch_access()
                        self.repository.update_memory(existing)

            elif decision.outcome == DecisionOutcome.ARCHIVE_EXISTING:
                if decision.target_memory_id:
                    self.repository.archive_memory(decision.target_memory_id)

        except Exception as e:
            print(f"[MemoryManager] Execution error for outcome {decision.outcome.value}: {e}")

    # ── Lifecycle Event Point Hooks ─────────────────────────────────────────

    def on_conversation_start(
        self, user_id: int, session_id: Optional[int] = None
    ) -> None:
        """Event point: Called when a new conversation session starts."""
        event = MemoryEvent(
            event_type=MemoryEventType.CONVERSATION_STARTED,
            user_id=user_id,
            session_id=session_id,
        )
        self.dispatcher.dispatch(event)

    def on_user_message(
        self, user_id: int, message: str, session_id: Optional[int] = None
    ) -> PipelineResult:
        """Event point: Called when a user message is received."""
        event = MemoryEvent(
            event_type=MemoryEventType.USER_MESSAGE_RECEIVED,
            user_id=user_id,
            session_id=session_id,
            payload={"message": message},
        )
        self.dispatcher.dispatch(event)
        return self.process_turn(user_id=user_id, user_message=message, session_id=session_id)

    def on_assistant_response(
        self, user_id: int, response: str, session_id: Optional[int] = None
    ) -> None:
        """Event point: Called when an assistant response is generated."""
        event = MemoryEvent(
            event_type=MemoryEventType.ASSISTANT_RESPONSE_GENERATED,
            user_id=user_id,
            session_id=session_id,
            payload={"response": response},
        )
        self.dispatcher.dispatch(event)

    def on_session_close(
        self, user_id: int, session_id: Optional[int] = None
    ) -> None:
        """Extension point hook for future Consolidation Engine integration."""
        event = MemoryEvent(
            event_type=MemoryEventType.SESSION_CLOSED,
            user_id=user_id,
            session_id=session_id,
        )
        self.dispatcher.dispatch(event)

    def get_memory_context(
        self, user_id: int, query: str, limit: int = 5
    ) -> MemoryContext:
        """
        Extension point stub for future Retrieval & Context Engine integration.
        Currently returns an empty MemoryContext container until Milestone 10+.
        """
        return MemoryContext()


# Global singleton instance for foundation access
memory_manager = MemoryManager()
