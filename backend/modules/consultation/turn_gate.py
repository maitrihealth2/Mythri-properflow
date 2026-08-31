"""
Turn Complexity Gate — Mythri's single centralized turn classifier.

Classification order (deterministic, zero-LLM):
  1. Existing crisis detection result (already computed before this is called)
  2. Safety-adjacent phrase check (ambiguous short messages that could be benign or dangerous)
  3. Explicit memory/recall request
  4. Trivial social phrase
  5. Casual (light content)
  6. Default → MEANINGFUL

Safety logic:
  - check_for_crisis() must run BEFORE classify_turn_complexity() is called.
  - This module reads the crisis result as input — it does NOT re-run crisis detection.
  - Safety-adjacent phrases route to SENSITIVE without requiring an LLM call.
  - Token optimization NEVER weakens the safety path.
"""

import re
from enum import Enum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from security.crisis_handler import CrisisCheckResult


class TurnComplexity(str, Enum):
    TRIVIAL    = "trivial"     # Pure social lubricant — "Hi", "Haha", "Thanks"
    CASUAL     = "casual"      # Light chat — low word count, no emotional content
    MEANINGFUL = "meaningful"  # Real content — emotions, topics, questions, stories
    SENSITIVE  = "sensitive"   # Safety-adjacent or elevated risk — full safety stack


# ── Pure trivial social phrases ──────────────────────────────────────────────
# Must match EXACTLY (after strip().lower()) AND word_count <= 4
TRIVIAL_SET: frozenset[str] = frozenset({
    "hi", "hello", "hey", "yo", "sup",
    "haha", "lol", "lmao", "hehe", "hihi",
    "thanks", "thank you", "ty",
    "ok", "okay", "k", "kk",
    "yeah", "yep", "yup", "nah", "nope", "no",
    "sure", "alright", "gotcha",
    "hm", "hmm", "hmm okay", "oh okay",
    "good morning", "good night", "gm", "gn", "goodnight",
    "bye", "byee", "goodbye", "take care",
    "nice", "cool", "great", "awesome",
    "😂", "👍", "🙏", "😊", "❤️", "😄",
    "morning", "evening",
})

# ── Safety-adjacent phrases ───────────────────────────────────────────────────
# Short messages that look casual but could indicate crisis/risk.
# Routes to SENSITIVE unconditionally — never to TRIVIAL or CASUAL.
# This is NOT a crisis detector — it catches the ambiguous middle ground.
SAFETY_ADJACENT_PHRASES: tuple[str, ...] = (
    "i'm done", "im done", "i am done",
    "i can't anymore", "i cant anymore", "i cannot anymore",
    "there's no point", "there is no point", "no point",
    "i don't want to", "i dont want to",
    "leave me alone",
    "make them pay",
    "i give up",
    "i quit everything",
    "it's over", "its over", "it is over",
    "i can't do this", "i cant do this",
    "i don't care anymore", "i dont care anymore",
    "nothing matters",
    "i hate myself",
    "i want to disappear",
    "i'm not okay", "im not okay", "i am not okay",
    "i feel nothing",
    "nobody cares",
    "what's the point", "whats the point",
    "tired of everything", "tired of living",
    "can't take it anymore", "cant take it anymore",
    "i'm exhausted of life", "im exhausted of life",
)

# ── Explicit memory/recall triggers ──────────────────────────────────────────
# Reuses the same list as ConversationSpeechActEngine to stay consistent.
RECALL_TRIGGERS: tuple[str, ...] = (
    "do you remember",
    "what do you remember",
    "what do you know about",
    "who is", "who was",
    "tell me about",
    "what are my goals",
    "what is my", "what are my",
    "did i tell you",
    "remind me",
    "what did i say",
    "you remember when",
)

# ── Emotional keywords (for casual→meaningful promotion) ─────────────────────
EMOTIONAL_KEYWORDS: tuple[str, ...] = (
    "feel", "feeling", "felt", "depressed", "anxious", "anxiety",
    "sad", "lonely", "stressed", "scared", "afraid", "hopeless",
    "angry", "frustrated", "overwhelmed", "happy", "excited",
    "worried", "nervous", "panic", "grief", "loss",
    "terrible", "horrible", "awful", "great", "amazing", "proud",
)


# ── Classifier ────────────────────────────────────────────────────────────────

def classify_turn_complexity(
    message: str,
    crisis_result: "CrisisCheckResult",
) -> TurnComplexity:
    """
    Classify the complexity of a user turn deterministically.
    Crisis result must be computed before this function is called.

    Returns TurnComplexity which flows to all downstream components.
    """

    # Step 1: Crisis always routes to SENSITIVE
    if crisis_result.is_crisis:
        return TurnComplexity.SENSITIVE

    lower = message.strip().lower()

    # Step 2: Safety-adjacent language → SENSITIVE
    # Short ambiguous messages that should never be treated as trivial/casual
    if _is_safety_adjacent(lower):
        return TurnComplexity.SENSITIVE

    # Step 3: Explicit memory recall → MEANINGFUL
    if _is_explicit_recall(lower):
        return TurnComplexity.MEANINGFUL

    # Step 4: Pure trivial social phrase → TRIVIAL
    word_count = len(message.split())
    if lower in TRIVIAL_SET and word_count <= 4:
        return TurnComplexity.TRIVIAL
    # Also handle single emoji or very short pure greeting variants
    if word_count <= 2 and lower.strip(".,!?") in TRIVIAL_SET:
        return TurnComplexity.TRIVIAL

    # Step 5: Light casual message → CASUAL
    if (word_count <= 12
            and not _has_emotional_keyword(lower)
            and not _has_named_entity(message)):
        return TurnComplexity.CASUAL

    # Step 6: Default → MEANINGFUL
    return TurnComplexity.MEANINGFUL


def _is_safety_adjacent(lower: str) -> bool:
    """Check if the message matches a safety-adjacent phrase. O(n) linear scan, zero LLM."""
    for phrase in SAFETY_ADJACENT_PHRASES:
        if phrase in lower:
            return True
    return False


def _is_explicit_recall(lower: str) -> bool:
    """Check if the user is explicitly asking Mythri to recall something."""
    for trigger in RECALL_TRIGGERS:
        if trigger in lower:
            return True
    return False


def _has_emotional_keyword(lower: str) -> bool:
    """Check for emotional content keywords that promote CASUAL → MEANINGFUL."""
    for kw in EMOTIONAL_KEYWORDS:
        if re.search(rf"\b{re.escape(kw)}\b", lower):
            return True
    return False


def _has_named_entity(message: str) -> bool:
    """
    Lightweight named-entity and acronym heuristic — no NLP library required.
    Looks for capitalized words or acronyms (e.g. CBT, ADHD, OCD) that aren't just sentence start.
    Returns True if a likely proper name or acronym is present.
    """
    words = message.split()
    if len(words) <= 1:
        # Check single-word acronyms like "CBT" or "ADHD"
        if words:
            clean = words[0].strip(".,!?;:\"'")
            if len(clean) >= 2 and clean.isupper():
                return True
        return False
    # Check all words after the first word
    for word in words[1:]:
        clean = word.strip(".,!?;:\"'")
        if len(clean) >= 2:
            # Proper name (e.g. "Alice") or acronym (e.g. "CBT", "PTSD", "ADHD")
            if (clean[0].isupper() and clean[1:].islower()) or clean.isupper():
                return True
    return False


def history_limit_for(complexity: TurnComplexity) -> int:
    """Return the number of history messages to include for a given complexity."""
    return {
        TurnComplexity.TRIVIAL:    0,
        TurnComplexity.CASUAL:     8,
        TurnComplexity.MEANINGFUL: 20,
        TurnComplexity.SENSITIVE:  20,
    }[complexity]
