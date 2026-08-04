"""
Prompt Context Engine Subsystem
Transforms OptimizedMemoryContext into a structured, provider-agnostic PromptContext.
Prepares categorized context sections for downstream LLM prompt injection without performing the injection itself.
Zero LLM calls. Zero prompt generation.
"""
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from modules.memory.attention import OptimizedMemoryContext
from modules.memory.domain import MemoryCategory, MemoryEntity
from modules.memory.episodic import EpisodicExperience
from modules.memory.ranking import RankedCandidate
from modules.memory.short_term import ShortTermMemoryItem, WorkingMemoryKind


@dataclass
class PromptContextSection:
    """A structured, provider-agnostic section of context for prompt injection."""
    name: str
    items: List[str] = field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return len(self.items) == 0

    def add_item(self, content: str) -> None:
        """Adds a content string if it doesn't already exist in this section."""
        if content not in self.items:
            self.items.append(content)


@dataclass
class PromptContext:
    """
    Structured Prompt Context container.
    Maps active attention memory into semantic categories ready for prompt builders.
    Preserves section ordering and metadata.
    """
    current_session: PromptContextSection = field(default_factory=lambda: PromptContextSection("Current Session"))
    active_goals: PromptContextSection = field(default_factory=lambda: PromptContextSection("Active Goals"))
    emotional_context: PromptContextSection = field(default_factory=lambda: PromptContextSection("Emotional Context"))
    personal_facts: PromptContextSection = field(default_factory=lambda: PromptContextSection("Personal Facts"))
    preferences: PromptContextSection = field(default_factory=lambda: PromptContextSection("Preferences"))
    relationships: PromptContextSection = field(default_factory=lambda: PromptContextSection("Relationships"))
    relevant_episodes: PromptContextSection = field(default_factory=lambda: PromptContextSection("Relevant Episodes"))
    background_context: PromptContextSection = field(default_factory=lambda: PromptContextSection("Background Context"))
    
    duration_ms: float = 0.0
    telemetry: Dict[str, Any] = field(default_factory=dict)

    @property
    def all_sections(self) -> List[PromptContextSection]:
        """Returns all sections in defined injection order."""
        return [
            self.current_session,
            self.active_goals,
            self.emotional_context,
            self.personal_facts,
            self.preferences,
            self.relationships,
            self.relevant_episodes,
            self.background_context,
        ]

    @property
    def total_items(self) -> int:
        return sum(len(s.items) for s in self.all_sections)


class PromptContextEngine:
    """
    Pure Prompt Context Construction Engine.
    Transforms OptimizedMemoryContext into a PromptContext ready for the Prompt Builder layer.
    """

    def build_prompt_context(self, optimized_context: OptimizedMemoryContext) -> PromptContext:
        """
        Map active candidates from OptimizedMemoryContext into structured semantic PromptContext sections.
        """
        start_time = time.time()
        prompt_ctx = PromptContext()

        # Gather all active candidates across Foreground, Supporting, and Background tiers.
        # Note: We exclude Deferred context as it was dropped by Attention token budget limits.
        active_candidates: List[RankedCandidate] = (
            optimized_context.foreground_context
            + optimized_context.supporting_context
            + optimized_context.background_context
        )

        for rc in active_candidates:
            cand = rc.candidate
            content = rc.content.strip()
            
            if not content:
                continue

            # 1. Map Short-Term Working Session Items
            if rc.candidate_type == "short_term":
                if isinstance(cand, ShortTermMemoryItem):
                    if cand.kind == WorkingMemoryKind.SESSION_GOAL:
                        prompt_ctx.active_goals.add_item(content)
                    elif cand.kind == WorkingMemoryKind.EMOTIONAL_STATE:
                        prompt_ctx.emotional_context.add_item(content)
                    elif cand.kind == WorkingMemoryKind.TEMPORARY_PREFERENCE:
                        prompt_ctx.preferences.add_item(content)
                    elif not content.endswith("?"):
                        prompt_ctx.current_session.add_item(content)
                elif not content.endswith("?"):
                    prompt_ctx.current_session.add_item(content)

            # 2. Map Episodic Narrative Experiences
            elif rc.candidate_type == "episodic":
                prompt_ctx.relevant_episodes.add_item(content)
                if isinstance(cand, EpisodicExperience) and cand.primary_emotion:
                    # Provide episode emotion context explicitly as well
                    prompt_ctx.emotional_context.add_item(content)

            # 3. Map Long-Term Memory Entities
            elif rc.candidate_type == "long_term" and isinstance(cand, MemoryEntity):
                cat = cand.metadata.category
                if cat == MemoryCategory.GOAL:
                    prompt_ctx.active_goals.add_item(content)
                elif cat == MemoryCategory.PREFERENCE:
                    prompt_ctx.preferences.add_item(content)
                elif cat == MemoryCategory.RELATIONSHIP:
                    prompt_ctx.relationships.add_item(content)
                elif cat == MemoryCategory.FACT:
                    prompt_ctx.personal_facts.add_item(content)
                else:
                    prompt_ctx.background_context.add_item(content)
                    
            else:
                prompt_ctx.background_context.add_item(content)

        duration_ms = round((time.time() - start_time) * 1000, 2)
        prompt_ctx.duration_ms = duration_ms
        prompt_ctx.telemetry = {
            "total_sections_populated": sum(1 for s in prompt_ctx.all_sections if not s.is_empty),
            "total_prompt_items": prompt_ctx.total_items,
            "section_distribution": {s.name: len(s.items) for s in prompt_ctx.all_sections},
            "build_duration_ms": duration_ms
        }

        # Extension Hooks
        self._provider_format_stub()
        self._prompt_metadata_stub()

        return prompt_ctx

    # ── Future Extensibility Hooks (Stubs) ────────────────────────────────────

    def _provider_format_stub(self) -> None:
        """Extension Point Stub: Hook for future provider-specific formatting (e.g., Sarvam vs OpenAI)."""
        pass

    def _prompt_metadata_stub(self) -> None:
        """Extension Point Stub: Hook for injecting structural metadata into prompts."""
        pass
