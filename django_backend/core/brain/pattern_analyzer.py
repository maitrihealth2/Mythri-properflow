"""
Pattern Analyzer -- Fast heuristic distress signal detection.
No LLM calls. Pure text analysis feeding into the Analyst.

Signals detected:
  - Sentence fragmentation (shorter msgs = withdrawal/distress)
  - Absolute language ("always", "never", "nobody", "nothing", "everything")
  - Punctuation/caps stress markers (!!!, ???, ALL CAPS words)
  - Topic repetition across recent turns
  - Message length trend
"""
from __future__ import annotations
import re
from dataclasses import dataclass
from typing import List

ABSOLUTE_WORDS = {
    "always", "never", "nobody", "everybody", "everything", "nothing",
    "completely", "totally", "absolutely", "impossible", "hopeless",
    "worthless", "useless", "forever", "ruined", "destroyed", "hate",
    "cant", "cannot", "wont", "terrible", "horrible", "awful",
}

DISTRESS_INTENSIFIERS = [
    "so much", "too much", "all the time", "every single", "not at all",
    "i give up", "i cant do this", "whats the point", "no one cares",
    "doesnt matter", "its over", "im done", "im tired of",
]


@dataclass
class PatternSignal:
    fragmentation_score: float = 0.0
    absolutism_score: float = 0.0
    stress_punctuation_score: float = 0.0
    topic_repetition_score: float = 0.0
    length_trend: str = "stable"
    overall_distress: float = 0.0
    summary: str = ""

    def as_prompt_block(self) -> str:
        if self.overall_distress < 0.2:
            return ""
        lines = [f"PATTERN ANALYSIS SIGNALS (distress={self.overall_distress:.2f}):"]
        if self.fragmentation_score > 0.3:
            lines.append(f"  - Message fragmentation: {self.fragmentation_score:.2f} (user sending shorter, broken messages)")
        if self.absolutism_score > 0.2:
            lines.append(f"  - Absolute language: {self.absolutism_score:.2f} (catastrophising, black-and-white thinking)")
        if self.stress_punctuation_score > 0.3:
            lines.append(f"  - Stress punctuation/caps: {self.stress_punctuation_score:.2f} (high emotional intensity in formatting)")
        if self.topic_repetition_score > 0.4:
            lines.append(f"  - Topic repetition: {self.topic_repetition_score:.2f} (user circling same theme repeatedly)")
        if self.length_trend == "decreasing":
            lines.append("  - Length trend: DECREASING (user becoming more withdrawn)")
        if self.summary:
            lines.append(f"  - Note: {self.summary}")
        return "\n".join(lines)


def _tokenize(text: str) -> List[str]:
    return re.findall(r"\b\w+\b", text.lower())


def _fragmentation_score(lengths: List[int]) -> float:
    if len(lengths) < 2:
        return 0.0
    avg = sum(lengths) / len(lengths)
    return min(max(0.0, 1.0 - (avg / 80.0)), 1.0)


def _absolutism_score(text: str) -> float:
    words = _tokenize(text)
    if not words:
        return 0.0
    hits = sum(1 for w in words if w in ABSOLUTE_WORDS)
    clean = text.lower().replace("'", "")
    for phrase in DISTRESS_INTENSIFIERS:
        if phrase in clean:
            hits += 1
    return min(hits / max(len(words) * 0.15, 1), 1.0)


def _stress_score(text: str) -> float:
    repeated = len(re.findall(r"[!?]{2,}", text))
    caps = sum(1 for w in text.split() if len(w) >= 3 and w.isupper())
    words = max(len(text.split()), 1)
    return min(((repeated * 0.3 + caps * 0.2) / words) * 5, 1.0)


def _length_trend(lengths: List[int]) -> str:
    if len(lengths) < 3:
        return "stable"
    diffs = [lengths[i] - lengths[i-1] for i in range(1, len(lengths))]
    avg = sum(diffs) / len(diffs)
    if avg < -10:
        return "decreasing"
    if avg > 10:
        return "increasing"
    return "stable"


def _repetition_score(messages: List[str]) -> float:
    if len(messages) < 3:
        return 0.0
    counts: dict[str, int] = {}
    for msg in messages:
        for w in _tokenize(msg):
            if len(w) > 4:
                counts[w] = counts.get(w, 0) + 1
    if not counts:
        return 0.0
    total = sum(counts.values())
    repeated = sum(c for c in counts.values() if c >= 2)
    return min(repeated / max(total * 0.3, 1), 1.0)


def analyze_patterns(recent_user_messages: List[str], current_message: str) -> PatternSignal:
    """
    Analyze distress signals from message text and conversation history.
    Returns a PatternSignal with scores and a prompt-ready summary block.
    """
    all_msgs = recent_user_messages + [current_message]
    lengths = [len(m) for m in all_msgs]

    frag  = _fragmentation_score(lengths)
    abso  = _absolutism_score(current_message)
    stress = _stress_score(current_message)
    repet = _repetition_score(all_msgs)
    trend = _length_trend(lengths)

    overall = min(frag * 0.25 + abso * 0.35 + stress * 0.15 + repet * 0.25, 1.0)

    notes = []
    if trend == "decreasing":
        notes.append("user becoming more withdrawn")
    if abso > 0.4:
        notes.append("strong catastrophising language")
    if repet > 0.5:
        notes.append("circling same theme")
    if stress > 0.4:
        notes.append("high emotional intensity in formatting")

    return PatternSignal(
        fragmentation_score=round(frag, 3),
        absolutism_score=round(abso, 3),
        stress_punctuation_score=round(stress, 3),
        topic_repetition_score=round(repet, 3),
        length_trend=trend,
        overall_distress=round(overall, 3),
        summary="; ".join(notes) if notes else "",
    )
