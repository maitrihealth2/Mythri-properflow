"""
Memory Read Pipeline Orchestration Subsystem
Coordinates the flow of information across Memory Retrieval, Ranking, Context Assembly, and Attention Engine.
Strictly orchestration: Does not generate prompts, call LLMs, or persist memory state.
Implements failure isolation and full read-path telemetry tracking.
"""
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from modules.memory.attention import AttentionEngine, OptimizedMemoryContext, TokenBudget
from modules.memory.context_assembly import MemoryContext, MemoryContextEngine
from modules.memory.ranking import MemoryRankingEngine, RankingResult
from modules.memory.retrieval import MemoryRetrievalEngine, RetrievalResult


@dataclass
class ReadPipelineTelemetry:
    """Telemetry captured across the Memory Read Pipeline execution."""
    retrieval_duration_ms: float = 0.0
    ranking_duration_ms: float = 0.0
    assembly_duration_ms: float = 0.0
    attention_duration_ms: float = 0.0
    total_pipeline_duration_ms: float = 0.0
    stage_status: Dict[str, str] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


class MemoryReadPipeline:
    """
    Orchestration layer for Memory Read Path Integration.
    Executes sequentially: Retrieval -> Ranking -> Context Assembly -> Attention.
    Implements failure isolation and telemetry tracking.
    """

    def __init__(
        self,
        retrieval_engine: MemoryRetrievalEngine,
        ranking_engine: Optional[MemoryRankingEngine] = None,
        context_engine: Optional[MemoryContextEngine] = None,
        attention_engine: Optional[AttentionEngine] = None,
    ):
        # Engines passed via dependency injection
        self.retrieval_engine = retrieval_engine
        self.ranking_engine = ranking_engine or MemoryRankingEngine()
        self.context_engine = context_engine or MemoryContextEngine()
        self.attention_engine = attention_engine or AttentionEngine()

    def run(
        self,
        user_id: int,
        query: str,
        session_id: Optional[int] = None,
        ranking_context: Optional[Dict[str, Any]] = None,
        token_budget: Optional[TokenBudget] = None,
    ) -> OptimizedMemoryContext:
        """
        Execute the Memory Read Pipeline safely with failure isolation.
        Produces an OptimizedMemoryContext for use by downstream modules.
        """
        start_time = time.time()
        telemetry = ReadPipelineTelemetry()
        telemetry.stage_status = {
            "retrieval": "pending",
            "ranking": "pending",
            "assembly": "pending",
            "attention": "pending",
        }

        # ── Stage 1: Retrieval ────────────────────────────────────────────────
        stage_start = time.time()
        try:
            retrieval_result = self.retrieval_engine.retrieve_candidates(
                user_id=user_id,
                query=query,
                session_id=session_id
            )
            telemetry.stage_status["retrieval"] = "success"
        except Exception as e:
            telemetry.stage_status["retrieval"] = "failed"
            telemetry.errors.append(f"Retrieval failed: {str(e)}")
            # Failure Isolation: Return empty context on Retrieval failure
            return self._build_empty_result(telemetry, start_time)
        finally:
            telemetry.retrieval_duration_ms = round((time.time() - stage_start) * 1000, 2)

        # ── Stage 2: Ranking ──────────────────────────────────────────────────
        stage_start = time.time()
        try:
            ranking_result = self.ranking_engine.rank_candidates(
                retrieval_result=retrieval_result,
                query=query,
                context=ranking_context
            )
            telemetry.stage_status["ranking"] = "success"
        except Exception as e:
            telemetry.stage_status["ranking"] = "failed"
            telemetry.errors.append(f"Ranking failed: {str(e)}")
            # Failure Isolation: Continue with empty RankingResult
            ranking_result = RankingResult(ranked_candidates=[])
        finally:
            telemetry.ranking_duration_ms = round((time.time() - stage_start) * 1000, 2)

        # ── Stage 3: Context Assembly ──────────────────────────────────────────
        stage_start = time.time()
        try:
            memory_context = self.context_engine.assemble_context(ranking_result=ranking_result)
            telemetry.stage_status["assembly"] = "success"
        except Exception as e:
            telemetry.stage_status["assembly"] = "failed"
            telemetry.errors.append(f"Assembly failed: {str(e)}")
            # Failure Isolation: Continue with empty MemoryContext
            memory_context = MemoryContext()
        finally:
            telemetry.assembly_duration_ms = round((time.time() - stage_start) * 1000, 2)

        # ── Stage 4: Attention Optimization ────────────────────────────────────
        stage_start = time.time()
        try:
            optimized_context = self.attention_engine.optimize_context(
                memory_context=memory_context,
                budget=token_budget
            )
            telemetry.stage_status["attention"] = "success"
        except Exception as e:
            telemetry.stage_status["attention"] = "failed"
            telemetry.errors.append(f"Attention failed: {str(e)}")
            # Failure Isolation: Return empty OptimizedMemoryContext on Attention failure
            return self._build_empty_result(telemetry, start_time)
        finally:
            telemetry.attention_duration_ms = round((time.time() - stage_start) * 1000, 2)

        # Extend returned telemetry with pipeline telemetry
        telemetry.total_pipeline_duration_ms = round((time.time() - start_time) * 1000, 2)
        optimized_context.telemetry["read_pipeline"] = {
            "retrieval_duration_ms": telemetry.retrieval_duration_ms,
            "ranking_duration_ms": telemetry.ranking_duration_ms,
            "assembly_duration_ms": telemetry.assembly_duration_ms,
            "attention_duration_ms": telemetry.attention_duration_ms,
            "total_pipeline_duration_ms": telemetry.total_pipeline_duration_ms,
            "stage_status": telemetry.stage_status,
        }
        optimized_context.errors.extend(telemetry.errors)
        optimized_context.warnings.extend(telemetry.warnings)

        # Future Extension Hooks
        self._prompt_context_engine_stub()
        self._reflection_engine_stub()
        self._safety_engine_stub()
        self._adaptive_reasoning_engine_stub()

        return optimized_context

    def _build_empty_result(
        self, telemetry: ReadPipelineTelemetry, start_time: float
    ) -> OptimizedMemoryContext:
        """Returns an empty OptimizedMemoryContext cleanly upon critical failure."""
        telemetry.total_pipeline_duration_ms = round((time.time() - start_time) * 1000, 2)
        empty_ctx = OptimizedMemoryContext()
        empty_ctx.errors.extend(telemetry.errors)
        empty_ctx.telemetry["read_pipeline"] = {
            "total_pipeline_duration_ms": telemetry.total_pipeline_duration_ms,
            "stage_status": telemetry.stage_status,
        }
        return empty_ctx

    # ── Future Extensibility Hooks (Stubs) ────────────────────────────────────

    def _prompt_context_engine_stub(self) -> None:
        """Extension Point Stub: Hook for future prompt injection integration."""
        pass

    def _reflection_engine_stub(self) -> None:
        """Extension Point Stub: Hook for future reflection context execution."""
        pass

    def _safety_engine_stub(self) -> None:
        """Extension Point Stub: Hook for future context safety verification."""
        pass

    def _adaptive_reasoning_engine_stub(self) -> None:
        """Extension Point Stub: Hook for future adaptive reasoning loops."""
        pass
