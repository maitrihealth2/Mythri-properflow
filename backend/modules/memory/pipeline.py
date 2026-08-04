"""
Memory Processing Pipeline Subsystem
Defines a modular, extensible pipeline for sequencing independent memory processing stages.
Does not perform persistence, orchestration, retrieval, or LLM calls.
Outputs structured PipelineResult and PipelineExecution objects for downstream execution by MemoryManager.
"""
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from modules.memory.decision import MemoryDecision, MemoryDecisionEngine
from modules.memory.domain import MemoryEntity
from modules.memory.extractor import ExtractionCandidate, MemoryExtractor


class StageExecutionStatus(str, Enum):
    SUCCESS = "success"
    WARNING = "warning"
    FAILED = "failed"


@dataclass
class PipelineExecution:
    """
    Detailed execution telemetry container for a single pipeline stage.
    Captures stage status, timing, warnings, errors, and output data.
    """
    stage_name: str
    status: StageExecutionStatus = StageExecutionStatus.SUCCESS
    execution_duration_ms: float = 0.0
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    retry_count: int = 0
    stage_output: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PipelineResult:
    """
    Structured outcome of executing a MemoryPipeline run.
    Contains candidate extractions, decisions, stage executions, and total timing.
    """
    user_id: int
    session_id: Optional[int] = None
    candidates: List[ExtractionCandidate] = field(default_factory=list)
    decisions: List[MemoryDecision] = field(default_factory=list)
    executions: List[PipelineExecution] = field(default_factory=list)
    duration_ms: float = 0.0

    @property
    def has_actionable_decisions(self) -> bool:
        """Returns True if any decision requires persistence action."""
        return any(d.is_actionable for d in self.decisions)


class PipelineStageProtocol(ABC):
    """Abstract protocol for independent memory processing pipeline stages."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for the pipeline stage."""
        pass

    @abstractmethod
    def process(self, payload: Dict[str, Any]) -> Tuple[Dict[str, Any], PipelineExecution]:
        """Execute processing on the pipeline payload dictionary and return execution telemetry."""
        pass


# ── Core Pipeline Stages ───────────────────────────────────────────────────

class ExtractionStage(PipelineStageProtocol):
    """Pipeline stage executing MemoryExtractor candidate distillation."""

    def __init__(self, extractor: Optional[MemoryExtractor] = None):
        self.extractor = extractor or MemoryExtractor()

    @property
    def name(self) -> str:
        return "extraction_stage"

    def process(self, payload: Dict[str, Any]) -> Tuple[Dict[str, Any], PipelineExecution]:
        start = time.time()
        user_id: int = payload.get("user_id", 0)
        user_message: str = payload.get("user_message", "")
        session_id: Optional[int] = payload.get("session_id")
        warnings: List[str] = []
        errors: List[str] = []
        status = StageExecutionStatus.SUCCESS

        try:
            candidates = self.extractor.extract_candidates(
                user_message=user_message, user_id=user_id, session_id=session_id
            )
            payload["candidates"] = candidates
            if not candidates:
                warnings.append("No candidate memories extracted from turn input.")
        except Exception as e:
            status = StageExecutionStatus.FAILED
            errors.append(f"Extraction failed: {str(e)}")
            candidates = []
            payload["candidates"] = []

        duration = round((time.time() - start) * 1000, 2)
        execution = PipelineExecution(
            stage_name=self.name,
            status=status,
            execution_duration_ms=duration,
            warnings=warnings,
            errors=errors,
            stage_output={"candidates_count": len(candidates)},
        )
        return payload, execution


class DecisionStage(PipelineStageProtocol):
    """Pipeline stage executing MemoryDecisionEngine policy evaluation."""

    def __init__(self, decision_engine: Optional[MemoryDecisionEngine] = None):
        self.decision_engine = decision_engine or MemoryDecisionEngine()

    @property
    def name(self) -> str:
        return "decision_stage"

    def process(self, payload: Dict[str, Any]) -> Tuple[Dict[str, Any], PipelineExecution]:
        start = time.time()
        candidates: List[ExtractionCandidate] = payload.get("candidates", [])
        existing_memories: Optional[List[MemoryEntity]] = payload.get("existing_memories")
        warnings: List[str] = []
        errors: List[str] = []
        status = StageExecutionStatus.SUCCESS
        decisions: List[MemoryDecision] = []

        try:
            if candidates:
                decisions = self.decision_engine.evaluate_batch(
                    candidates=candidates, existing_memories=existing_memories
                )
                payload["decisions"] = decisions
            else:
                payload["decisions"] = []
        except Exception as e:
            status = StageExecutionStatus.FAILED
            errors.append(f"Decision evaluation failed: {str(e)}")
            payload["decisions"] = []

        duration = round((time.time() - start) * 1000, 2)
        execution = PipelineExecution(
            stage_name=self.name,
            status=status,
            execution_duration_ms=duration,
            warnings=warnings,
            errors=errors,
            stage_output={"decisions_count": len(decisions)},
        )
        return payload, execution


# ── Extensible Memory Pipeline Composer ──────────────────────────────────────

class MemoryPipeline:
    """
    Extensible memory processing pipeline.
    Sequences independent pipeline stages via composition.
    Does not perform repository writes or manager orchestration.
    """

    def __init__(self, stages: Optional[List[PipelineStageProtocol]] = None):
        if stages is not None:
            self._stages = list(stages)
        else:
            self._stages = [
                ExtractionStage(),
                DecisionStage(),
            ]

    def register_stage(self, stage: PipelineStageProtocol) -> None:
        """Register a new processing stage into the pipeline."""
        self._stages.append(stage)

    def run(
        self,
        user_id: int,
        user_message: str,
        session_id: Optional[int] = None,
        existing_memories: Optional[List[MemoryEntity]] = None,
    ) -> PipelineResult:
        """
        Execute registered pipeline stages sequentially over input data.
        Produces structured PipelineResult containing PipelineExecution telemetry.
        """
        start_time = time.time()
        payload: Dict[str, Any] = {
            "user_id": user_id,
            "user_message": user_message,
            "session_id": session_id,
            "existing_memories": existing_memories,
            "candidates": [],
            "decisions": [],
        }

        executions: List[PipelineExecution] = []

        for stage in self._stages:
            payload, execution = stage.process(payload)
            executions.append(execution)

        duration_ms = round((time.time() - start_time) * 1000, 2)

        return PipelineResult(
            user_id=user_id,
            session_id=session_id,
            candidates=payload.get("candidates", []),
            decisions=payload.get("decisions", []),
            executions=executions,
            duration_ms=duration_ms,
        )
