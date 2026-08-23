"""
Support Decision Router
Translates the assessor case_file into a concrete routing decision.
Routes: TALK | PROPOSE_EXERCISE | GROUND | ESCALATE

This is intentionally simple deterministic logic for MVP.
No additional LLM call needed — uses the assessor's case_file directly.
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class SupportDecision:
    mode: str                        # TALK | PROPOSE_EXERCISE | GROUND | ESCALATE
    exercise_type: Optional[str]     # GROUNDING | BREATHING | REFLECTION | BODY_SCAN
    reason: str
    confidence: float


def route(case_file: dict, is_crisis: bool, exercise_state: str) -> SupportDecision:
    """
    Converts case_file into a concrete support decision.
    Uses deterministic rules for MVP — no additional LLM call needed.

    Priority order:
      1. Crisis → always ESCALATE
      2. High risk → ESCALATE
      3. GROUND strategy + idle → pick exercise type from emotion/patterns
      4. PROPOSE_EXERCISE strategy + idle → let LLM propose (don't start yet)
      5. Default → TALK
    """
    if is_crisis:
        return SupportDecision(
            mode="ESCALATE",
            exercise_type=None,
            reason="crisis_detected",
            confidence=1.0,
        )

    strategy   = case_file.get("runtime_state", {}).get("response_strategy", "LISTEN")
    risk       = case_file.get("conversation_state", {}).get("risk_level", "low")
    emotion    = case_file.get("emotional_state", {}).get("primary", "neutral")
    intensity  = float(case_file.get("emotional_state", {}).get("intensity", 0.0))
    patterns   = [
        p.get("pattern", "")
        for p in case_file.get("cognitive_patterns", [])
        if isinstance(p, dict)
    ]

    # Safety escalation (elevated risk, not full crisis)
    if risk in ("high", "imminent"):
        return SupportDecision(
            mode="ESCALATE",
            exercise_type=None,
            reason="high_risk_level",
            confidence=0.95,
        )

    # Exercise routing — only when assessor explicitly says GROUND and no exercise running
    if strategy == "GROUND" and exercise_state == "idle":
        # Pick exercise type based on emotion and cognitive patterns
        if "rumination" in patterns or "overthinking" in patterns:
            ex = "BODY_SCAN"
        elif any(w in emotion for w in ("overwhelm", "panic", "dissoc")):
            ex = "GROUNDING"
        elif any(w in emotion for w in ("anxiety", "fear", "nervous", "worry")):
            ex = "BREATHING"
        elif intensity > 0.8:
            ex = "GROUNDING"
        else:
            ex = "GROUNDING"

        return SupportDecision(
            mode="GROUND",
            exercise_type=ex,
            reason=f"strategy=GROUND emotion={emotion} patterns={patterns}",
            confidence=0.85,
        )

    # Propose — let LLM introduce the idea, don't start exercise yet
    if strategy == "PROPOSE_EXERCISE" and exercise_state == "idle":
        return SupportDecision(
            mode="PROPOSE_EXERCISE",
            exercise_type=None,
            reason="assessor_strategy=PROPOSE_EXERCISE",
            confidence=0.80,
        )

    # Default: conversation
    return SupportDecision(
        mode="TALK",
        exercise_type=None,
        reason=f"strategy={strategy}",
        confidence=0.90,
    )
