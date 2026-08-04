"""
Memory Context Assembly Engine Subsystem
Transforms ranked candidates from MemoryRankingEngine into structured cognitive context (MemoryContext).
Organizes memories into 8 structured cognitive groups (Current Session, Active Goals, Emotional Context,
Personal Facts, Preferences, Relationships, Relevant Episodes, Important Long-Term Facts) with assigned Priority Tiers.
Contains zero context optimization, zero token trimming/budgeting, zero prompt formatting, and zero LLM calls.
"""
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

from modules.memory.domain import MemoryCategory, MemoryEntity
from modules.memory.episodic import EpisodicExperience
from modules.memory.ranking import RankedCandidate, RankingResult
from modules.memory.short_term import ShortTermMemoryItem, WorkingMemoryKind


class PriorityTier(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class GroupedContext:
    """
    Structured container for a single cognitive context group.
    """
    group_name: str
    priority: PriorityTier
    candidates: List[RankedCandidate] = field(default_factory=list)

    @property
    def count(self) -> int:
        """Return candidate count inside this group."""
        return len(self.candidates)


@dataclass
class MemoryContext:
    """
    Structured Cognitive Memory Context object produced by MemoryContextEngine.
    Exposes 8 structured cognitive context groups organized by priority tier.
    Does NOT contain natural language prompt blocks or formatted system strings.
    """
    current_session: GroupedContext = field(
        default_factory=lambda: GroupedContext("current_session", PriorityTier.CRITICAL)
    )
    active_goals: GroupedContext = field(
        default_factory=lambda: GroupedContext("active_goals", PriorityTier.HIGH)
    )
    emotional_context: GroupedContext = field(
        default_factory=lambda: GroupedContext("emotional_context", PriorityTier.MEDIUM)
    )
    personal_facts: GroupedContext = field(
        default_factory=lambda: GroupedContext("personal_facts", PriorityTier.HIGH)
    )
    preferences: GroupedContext = field(
        default_factory=lambda: GroupedContext("preferences", PriorityTier.HIGH)
    )
    relationships: GroupedContext = field(
        default_factory=lambda: GroupedContext("relationships", PriorityTier.MEDIUM)
    )
    relevant_episodes: GroupedContext = field(
        default_factory=lambda: GroupedContext("relevant_episodes", PriorityTier.MEDIUM)
    )
    important_long_term_facts: GroupedContext = field(
        default_factory=lambda: GroupedContext("important_long_term_facts", PriorityTier.LOW)
    )
    assembly_duration_ms: float = 0.0
    telemetry: Dict[str, Any] = field(default_factory=dict)

    @property
    def all_groups(self) -> List[GroupedContext]:
        """Return list of all 8 cognitive context groups."""
        return [
            self.current_session,
            self.active_goals,
            self.personal_facts,
            self.preferences,
            self.emotional_context,
            self.relationships,
            self.relevant_episodes,
            self.important_long_term_facts,
        ]

    @property
    def total_memories_count(self) -> int:
        """Total memory items assembled across all cognitive groups."""
        return sum(g.count for g in self.all_groups)


class MemoryContextEngine:
    """
    Pure Memory Context Assembly Engine.
    Transforms RankingResult into a structured cognitive MemoryContext container.
    """

    def assemble_context(self, ranking_result: RankingResult) -> MemoryContext:
        """
        Assemble ranked candidate memories into structured cognitive context groups with assigned priority tiers.
        """
        start_time = time.time()
        context = MemoryContext()

        for rc in ranking_result.ranked_candidates:
            cand = rc.candidate

            # 1. Categorize Short-Term Working Session Items
            if rc.candidate_type == "short_term":
                if isinstance(cand, ShortTermMemoryItem):
                    if cand.kind == WorkingMemoryKind.SESSION_GOAL:
                        context.active_goals.candidates.append(rc)
                    elif cand.kind == WorkingMemoryKind.EMOTIONAL_STATE:
                        context.emotional_context.candidates.append(rc)
                    elif cand.kind == WorkingMemoryKind.TEMPORARY_PREFERENCE:
                        context.preferences.candidates.append(rc)
                    else:
                        context.current_session.candidates.append(rc)
                else:
                    context.current_session.candidates.append(rc)

            # 2. Categorize Episodic Narrative Experiences
            elif rc.candidate_type == "episodic":
                context.relevant_episodes.candidates.append(rc)
                if isinstance(cand, EpisodicExperience) and cand.primary_emotion:
                    context.emotional_context.candidates.append(rc)

            # 3. Categorize Long-Term Memory Entities
            elif rc.candidate_type == "long_term" and isinstance(cand, MemoryEntity):
                cat = cand.metadata.category
                if cat == MemoryCategory.GOAL:
                    context.active_goals.candidates.append(rc)
                elif cat == MemoryCategory.PREFERENCE:
                    context.preferences.candidates.append(rc)
                elif cat == MemoryCategory.RELATIONSHIP:
                    context.relationships.candidates.append(rc)
                elif cat == MemoryCategory.FACT:
                    context.personal_facts.candidates.append(rc)
                else:
                    context.important_long_term_facts.candidates.append(rc)

            else:
                context.important_long_term_facts.candidates.append(rc)

        # Calculate Telemetry Metrics
        duration_ms = round((time.time() - start_time) * 1000, 2)
        context.assembly_duration_ms = duration_ms

        group_distribution = {g.group_name: g.count for g in context.all_groups}
        priority_distribution = {
            tier.value: sum(g.count for g in context.all_groups if g.priority == tier)
            for tier in PriorityTier
        }

        context.telemetry = {
            "total_assembled_items": context.total_memories_count,
            "assembly_duration_ms": duration_ms,
            "group_sizes": group_distribution,
            "priority_distribution": priority_distribution,
        }

        # Trigger Future Extension Point Stubs
        self._context_optimization_stub(context)
        self._dynamic_token_budgeting_stub(context)
        self._therapist_mode_stub(context)

        return context

    # ── Future Extensibility Hooks (Stubs) ────────────────────────────────────

    def _context_optimization_stub(self, context: MemoryContext) -> None:
        """Extension Point Stub: Hook for future Context Optimization."""
        pass

    def _dynamic_token_budgeting_stub(self, context: MemoryContext) -> None:
        """Extension Point Stub: Hook for future Dynamic Token Budgeting."""
        pass

    def _therapist_mode_stub(self, context: MemoryContext) -> None:
        """Extension Point Stub: Hook for future Therapist Mode formatting."""
        pass

    def _safety_mode_stub(self, context: MemoryContext) -> None:
        """Extension Point Stub: Hook for future Safety Mode intervention."""
        pass

    def _reflection_mode_stub(self, context: MemoryContext) -> None:
        """Extension Point Stub: Hook for future Reflection Mode context synthesis."""
        pass
