"""
Memory Promotion Engine Subsystem
Executes approved ConsolidationPlans by routing candidate memories to destination abstractions
(MemoryRepository for Long-Term, EpisodicDestinationProtocol for Episodic).
Integrates MemoryEvolutionEngine and MemoryIndexEngine into a cohesive, deterministic write pipeline.
Owns deterministic routing and execution isolation only; performs zero decision-making,
zero retrieval, zero ranking, and zero LLM provider calls.
"""
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from modules.memory.consolidation import ConsolidationPlan
from modules.memory.contracts import MemoryStoreProtocol
from modules.memory.domain import MemoryEntity
from modules.memory.evolution import EvolutionTransition, MemoryEvolutionEngine
from modules.memory.index import MemoryIndexEngine
from modules.memory.repository import MemoryRepository
from modules.memory.short_term import ShortTermMemoryItem


class EpisodicDestinationProtocol(ABC):
    """Abstraction protocol for Episodic Memory destination persistence."""

    @abstractmethod
    def save_episodic_memory(self, entity: MemoryEntity) -> MemoryEntity:
        """Persist an episodic memory candidate."""
        pass


class DefaultEpisodicDestinationAdapter(EpisodicDestinationProtocol):
    """Default adapter routing episodic memory candidates to MemoryRepository."""

    def __init__(self, repository: Optional[MemoryRepository] = None):
        self.repository = repository

    def save_episodic_memory(self, entity: MemoryEntity) -> MemoryEntity:
        if self.repository:
            return self.repository.save_memory(entity)
        return entity


@dataclass
class PromotionResult:
    """
    Detailed execution telemetry container for MemoryPromotionEngine execution.
    Tracks successful promotions, failed promotions, discarded items, timing, and errors.
    """
    session_id: int
    user_id: int
    successful_promotions: List[MemoryEntity] = field(default_factory=list)
    failed_promotions: List[MemoryEntity] = field(default_factory=list)
    discarded_items: List[ShortTermMemoryItem] = field(default_factory=list)
    duration_ms: float = 0.0
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    @property
    def is_fully_successful(self) -> bool:
        """Returns True if all candidates were promoted without failures."""
        return len(self.failed_promotions) == 0 and len(self.errors) == 0


class MemoryPromotionEngine:
    """
    Pure Memory Promotion Engine.
    Coordinates the Long-Term Write Path: Promotion Engine -> Repository -> Evolution -> Index.
    Executes ConsolidationPlans through abstraction adapters with failure isolation.
    """

    def __init__(
        self,
        repository: Optional[MemoryRepository] = None,
        episodic_destination: Optional[EpisodicDestinationProtocol] = None,
        evolution_engine: Optional[MemoryEvolutionEngine] = None,
        index_engine: Optional[MemoryIndexEngine] = None,
    ):
        self.repository = repository
        self.episodic_destination = (
            episodic_destination or DefaultEpisodicDestinationAdapter(repository)
        )
        self.evolution_engine = evolution_engine or MemoryEvolutionEngine()
        self.index_engine = index_engine or MemoryIndexEngine()

    def execute_promotion(self, plan: ConsolidationPlan) -> PromotionResult:
        """
        Execute promotion workflow for an approved ConsolidationPlan.
        Deterministic Write Flow: Promotion -> Repository -> Evolution -> Index.
        """
        start_time = time.time()
        successful: List[MemoryEntity] = []
        failed: List[MemoryEntity] = []
        errors: List[str] = []
        warnings: List[str] = []

        # 1. Route Candidate Long-Term Memories (Repository -> Evolution -> Index)
        existing_memories: List[MemoryEntity] = []
        if self.repository:
            try:
                existing_memories = self.repository.get_memories_by_user(plan.user_id, limit=50)
            except Exception as ex:
                warnings.append(f"Could not fetch existing memories for evolution check: {ex}")

        for entity in plan.candidate_long_term_memories:
            try:
                # Step A: Evaluate Evolution Transition (Evolution Engine)
                evolution_res = self.evolution_engine.evaluate_evolution(
                    candidate=entity, existing_memories=existing_memories
                )

                # Step B: Execute Persistence according to Evolution Transition (Repository)
                if evolution_res.transition == EvolutionTransition.SUPERSEDE:
                    # Save new superseded version candidate
                    saved_entity = (
                        self.repository.save_memory(entity)
                        if self.repository else entity
                    )
                    # Update old historical entity in repository with link to new version
                    if evolution_res.target_existing:
                        if saved_entity.metadata.memory_id:
                            evolution_res.target_existing.metadata.superseded_by_id = saved_entity.metadata.memory_id
                        if self.repository:
                            self.repository.update_memory(evolution_res.target_existing)

                    # Step C: Incrementally Synchronize Index (Index Engine)
                    self._safely_sync_index_superseded(evolution_res.target_existing, saved_entity, warnings)

                    successful.append(saved_entity)

                elif evolution_res.transition == EvolutionTransition.MARK_COMPLETED:
                    if self.repository and evolution_res.target_existing:
                        self.repository.update_memory(evolution_res.target_existing)
                    self._safely_sync_index_completed(evolution_res.target_existing, warnings)
                    successful.append(entity)

                elif evolution_res.transition == EvolutionTransition.MERGE:
                    if self.repository and evolution_res.target_existing:
                        self.repository.update_memory(evolution_res.target_existing)
                    self._safely_sync_index_updated(evolution_res.target_existing, warnings)
                    successful.append(entity)

                else:  # REMAIN_ACTIVE / Default
                    saved_entity = (
                        self.repository.save_memory(entity)
                        if self.repository else entity
                    )
                    self._safely_sync_index_created(saved_entity, warnings)
                    successful.append(saved_entity)

            except Exception as e:
                failed.append(entity)
                errors.append(f"Long-term memory promotion failed for '{entity.content[:30]}...': {str(e)}")

        # 2. Route Candidate Episodic Memories
        for entity in plan.candidate_episodic_memories:
            try:
                saved_entity = self.episodic_destination.save_episodic_memory(entity)
                successful.append(saved_entity)
            except Exception as e:
                failed.append(entity)
                errors.append(f"Episodic memory promotion failed for '{entity.content[:30]}...': {str(e)}")

        # 3. Collect Discarded Items
        discarded = list(plan.discarded_items)
        if not plan.candidate_long_term_memories and not plan.candidate_episodic_memories:
            warnings.append("ConsolidationPlan contained no candidate memories for promotion.")

        duration_ms = round((time.time() - start_time) * 1000, 2)

        result = PromotionResult(
            session_id=plan.session_id,
            user_id=plan.user_id,
            successful_promotions=successful,
            failed_promotions=failed,
            discarded_items=discarded,
            duration_ms=duration_ms,
            errors=errors,
            warnings=warnings,
        )

        # 4. Trigger Future Extension Hooks
        self._reflection_store_stub(plan, result)
        self._safety_incident_store_stub(plan, result)

        return result

    # ── Index Synchronization Helper Methods (Failure Isolated) ────────────────

    def _safely_sync_index_created(self, entity: MemoryEntity, warnings: List[str]) -> None:
        try:
            self.index_engine.on_memory_created(entity)
        except Exception as e:
            warnings.append(f"Index sync failed for created memory {entity.metadata.memory_id}: {e}")

    def _safely_sync_index_updated(self, entity: Optional[MemoryEntity], warnings: List[str]) -> None:
        if not entity:
            return
        try:
            self.index_engine.on_memory_updated(entity)
        except Exception as e:
            warnings.append(f"Index sync failed for updated memory {entity.metadata.memory_id}: {e}")

    def _safely_sync_index_superseded(
        self, old_entity: Optional[MemoryEntity], new_entity: MemoryEntity, warnings: List[str]
    ) -> None:
        if not old_entity:
            self._safely_sync_index_created(new_entity, warnings)
            return
        try:
            self.index_engine.on_memory_superseded(old_entity, new_entity)
        except Exception as e:
            warnings.append(f"Index sync failed for superseded memory {old_entity.metadata.memory_id}: {e}")

    def _safely_sync_index_completed(self, entity: Optional[MemoryEntity], warnings: List[str]) -> None:
        if not entity:
            return
        try:
            self.index_engine.on_memory_completed(entity)
        except Exception as e:
            warnings.append(f"Index sync failed for completed memory {entity.metadata.memory_id}: {e}")

    # ── Future Extensibility Hooks (Stubs for Future Destinations) ────────────

    def _reflection_store_stub(
        self, plan: ConsolidationPlan, result: PromotionResult
    ) -> None:
        """Extension Point Stub: Hook for future Reflection Store destination routing."""
        pass

    def _safety_incident_store_stub(
        self, plan: ConsolidationPlan, result: PromotionResult
    ) -> None:
        """Extension Point Stub: Hook for future Safety Incident Store routing."""
        pass
