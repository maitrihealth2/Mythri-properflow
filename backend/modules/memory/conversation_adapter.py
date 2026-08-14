"""
Memory Conversation Adapter Subsystem
Integrates the fully assembled Memory Subsystem into Mythri's conversation pipeline.
Receives PromptContext and formats it cleanly for the Analyst and Sarvam LLM layers.
Owns zero cognitive logic. Acts strictly as an integration facade with guaranteed failure isolation.
"""
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from modules.memory.attention import TokenBudget
from modules.memory.prompt_context import PromptContext, PromptContextEngine
from modules.memory.read_pipeline import MemoryReadPipeline


@dataclass
class AdapterTelemetry:
    """Telemetry captured across the Memory Conversation Adapter execution."""
    adapter_duration_ms: float = 0.0
    memory_available: bool = False
    context_size_chars: int = 0
    injection_success: bool = False
    errors: List[str] = field(default_factory=list)


class MemoryConversationAdapter:
    """
    Integration adapter between Memory Read Pipeline and the Analyst conversational agent.
    Converts structured PromptContext into Analyst-compatible string blocks.
    Guarantees failure isolation (conversation never fails if memory fails).
    """

    def __init__(
        self,
        read_pipeline: MemoryReadPipeline,
        prompt_engine: Optional[PromptContextEngine] = None,
    ):
        self.read_pipeline = read_pipeline
        self.prompt_engine = prompt_engine or PromptContextEngine()

    def fetch_analyst_context(
        self,
        user_id: int,
        query: str,
        session_id: Optional[int] = None,
        token_budget: Optional[TokenBudget] = None,
    ) -> str:
        """
        Facade method for the conversation layer (api.py).
        Runs the Read Pipeline, builds the PromptContext, and formats it for the Analyst.
        Completely isolated; will return an empty string on any critical failure.
        """
        start_time = time.time()
        telemetry = AdapterTelemetry()

        try:
            # 1. Execute Memory Read Pipeline
            opt_ctx = self.read_pipeline.run(
                user_id=user_id,
                query=query,
                session_id=session_id,
                token_budget=token_budget,
            )

            # 2. Build Prompt Context
            prompt_ctx = self.prompt_engine.build_prompt_context(opt_ctx)

            # 3. Format for Analyst
            formatted_context = self.format_for_analyst(prompt_ctx)

            telemetry.memory_available = prompt_ctx.total_items > 0
            telemetry.context_size_chars = len(formatted_context)
            telemetry.injection_success = True

        except Exception as e:
            # Failure Isolation: Conversation must continue normally if memory fails.
            telemetry.errors.append(f"Adapter failure: {str(e)}")
            telemetry.injection_success = False
            formatted_context = ""

        finally:
            telemetry.adapter_duration_ms = round((time.time() - start_time) * 1000, 2)
            # In a full system, telemetry would be dispatched to an event bus here.

        return formatted_context

    def format_for_analyst(self, prompt_context: PromptContext) -> str:
        """
        Converts PromptContext sections into a flat markdown string block for the Analyst.
        """
        if prompt_context.total_items == 0:
            return ""

        blocks = []
        
        for section in prompt_context.all_sections:
            if not section.is_empty:
                blocks.append(f"[{section.name.upper()}]")
                for item in section.items:
                    blocks.append(f"• {item}")
                blocks.append("")  # Empty line for spacing

        return "\n".join(blocks).strip()

    # ── Future Extensibility Hooks (Stubs) ────────────────────────────────────

    def _therapist_adapter_stub(self) -> None:
        """Extension Point Stub: Hook for Therapist Persona Adapter."""
        pass

    def _voice_adapter_stub(self) -> None:
        """Extension Point Stub: Hook for Voice Modality Adapter."""
        pass

    def _coach_adapter_stub(self) -> None:
        """Extension Point Stub: Hook for Coaching Persona Adapter."""
        pass

    def _journal_adapter_stub(self) -> None:
        """Extension Point Stub: Hook for Journaling Integration Adapter."""
        pass
