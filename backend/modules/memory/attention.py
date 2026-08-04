"""
Attention & Context Optimization Engine Subsystem
Simulates Maitri's cognitive attention system.
Selects assembled context items from MemoryContext, calculates explicit attention scores,
structurally deduplicates content, and partitions working context into Foreground, Supporting,
Background, and Deferred tiers within configurable TokenBudgets.
Contains zero prompt text generation, zero LLM calls, zero memory retrieval, and zero persistence.
"""
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

from modules.memory.context_assembly import GroupedContext, MemoryContext, PriorityTier
from modules.memory.ranking import RankedCandidate


@dataclass
class TokenBudget:
    """
    Configurable token allocation budgets for cognitive attention tiers.
    Prevents magic numbers and supports flexible context scaling.
    """
    max_total_tokens: int = 1500
    foreground_ratio: float = 0.50
    supporting_ratio: float = 0.30
    background_ratio: float = 0.20

    @property
    def foreground_limit(self) -> int:
        return int(self.max_total_tokens * self.foreground_ratio)

    @property
    def supporting_limit(self) -> int:
        return int(self.max_total_tokens * self.supporting_ratio)

    @property
    def background_limit(self) -> int:
        return int(self.max_total_tokens * self.background_ratio)


@dataclass
class OptimizedMemoryContext:
    """
    Actionable output object produced by AttentionEngine.
    Partitions cognitive context into 4 attention tiers: Foreground, Supporting, Background, Deferred.
    """
    foreground_context: List[RankedCandidate] = field(default_factory=list)
    supporting_context: List[RankedCandidate] = field(default_factory=list)
    background_context: List[RankedCandidate] = field(default_factory=list)
    deferred_context: List[RankedCandidate] = field(default_factory=list)
    estimated_token_usage: int = 0
    compression_ratio: float = 1.0
    optimization_duration_ms: float = 0.0
    telemetry: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)

    @property
    def active_context_count(self) -> int:
        """Total memory items included across active attention tiers."""
        return (
            len(self.foreground_context)
            + len(self.supporting_context)
            + len(self.background_context)
        )


class AttentionEngine:
    """
    Pure Attention & Context Optimization Engine.
    Allocates cognitive attention across MemoryContext groups and optimizes token usage.
    """

    PRIORITY_MULTIPLIERS: Dict[PriorityTier, float] = {
        PriorityTier.CRITICAL: 1.50,
        PriorityTier.HIGH: 1.25,
        PriorityTier.MEDIUM: 1.00,
        PriorityTier.LOW: 0.75,
    }

    def optimize_context(
        self,
        memory_context: MemoryContext,
        budget: Optional[TokenBudget] = None,
    ) -> OptimizedMemoryContext:
        """
        Optimize MemoryContext into an OptimizedMemoryContext container with failure isolation.
        """
        start_time = time.time()
        active_budget = budget or TokenBudget()

        foreground: List[RankedCandidate] = []
        supporting: List[RankedCandidate] = []
        background: List[RankedCandidate] = []
        deferred: List[RankedCandidate] = []

        warnings: List[str] = []
        errors: List[str] = []

        # 1. Collect and Compute Attention Scores per Candidate
        attention_pool: List[Tuple[float, RankedCandidate, PriorityTier]] = []
        total_uncompressed_items = 0

        for group in memory_context.all_groups:
            try:
                multiplier = self.PRIORITY_MULTIPLIERS.get(group.priority, 1.0)
                total_uncompressed_items += group.count

                for rc in group.candidates:
                    attention_score = round(rc.total_score * multiplier, 4)
                    attention_pool.append((attention_score, rc, group.priority))

            except Exception as e:
                errors.append(f"Error processing context group '{group.group_name}': {str(e)}")

        # 2. Sort Attention Pool by Attention Score Descending
        attention_pool.sort(key=lambda x: x[0], reverse=True)

        # 3. Deterministic Structural Compression (Content Deduplication)
        seen_contents: Set[str] = set()
        deduplicated_pool: List[Tuple[float, RankedCandidate, PriorityTier]] = []

        for score, rc, priority in attention_pool:
            norm_content = rc.content.strip().lower()
            if norm_content not in seen_contents:
                seen_contents.add(norm_content)
                deduplicated_pool.append((score, rc, priority))

        # 4. Token Budget Allocation across Attention Tiers
        fg_tokens, sup_tokens, bg_tokens = 0, 0, 0

        for score, rc, priority in deduplicated_pool:
            est_tokens = max(1, len(rc.content) // 4)

            # High score / CRITICAL priority -> Foreground
            if (fg_tokens + est_tokens <= active_budget.foreground_limit) and (
                priority in (PriorityTier.CRITICAL, PriorityTier.HIGH) or score >= 0.70
            ):
                foreground.append(rc)
                fg_tokens += est_tokens

            # Secondary score / MEDIUM priority -> Supporting
            elif sup_tokens + est_tokens <= active_budget.supporting_limit and score >= 0.45:
                supporting.append(rc)
                sup_tokens += est_tokens

            # Background score / LOW priority -> Background
            elif bg_tokens + est_tokens <= active_budget.background_limit and score >= 0.30:
                background.append(rc)
                bg_tokens += est_tokens

            # Excess -> Deferred
            else:
                deferred.append(rc)

        total_tokens = fg_tokens + sup_tokens + bg_tokens
        compression_ratio = round(
            (len(foreground) + len(supporting) + len(background))
            / max(1, total_uncompressed_items),
            4,
        )

        duration_ms = round((time.time() - start_time) * 1000, 2)

        telemetry = {
            "max_token_budget": active_budget.max_total_tokens,
            "estimated_token_usage": total_tokens,
            "foreground_tokens": fg_tokens,
            "supporting_tokens": sup_tokens,
            "background_tokens": bg_tokens,
            "foreground_count": len(foreground),
            "supporting_count": len(supporting),
            "background_count": len(background),
            "deferred_count": len(deferred),
            "uncompressed_total_items": total_uncompressed_items,
            "compression_ratio": compression_ratio,
            "optimization_duration_ms": duration_ms,
        }

        # Trigger Future Extension Hooks
        self._dynamic_attention_stub()
        self._reflection_attention_stub()
        self._crisis_override_stub()

        return OptimizedMemoryContext(
            foreground_context=foreground,
            supporting_context=supporting,
            background_context=background,
            deferred_context=deferred,
            estimated_token_usage=total_tokens,
            compression_ratio=compression_ratio,
            optimization_duration_ms=duration_ms,
            telemetry=telemetry,
            warnings=warnings,
            errors=errors,
        )

    # ── Future Extensibility Hooks (Stubs) ────────────────────────────────────

    def _dynamic_attention_stub(self) -> None:
        """Extension Point Stub: Hook for future dynamic attention weighting."""
        pass

    def _reflection_attention_stub(self) -> None:
        """Extension Point Stub: Hook for future reflection attention synthesis."""
        pass

    def _therapist_mode_stub(self) -> None:
        """Extension Point Stub: Hook for future clinician therapist mode attention."""
        pass

    def _crisis_override_stub(self) -> None:
        """Extension Point Stub: Hook for future crisis intervention attention override."""
        pass

    def _multi_agent_context_stub(self) -> None:
        """Extension Point Stub: Hook for future multi-agent context partitioning."""
        pass
