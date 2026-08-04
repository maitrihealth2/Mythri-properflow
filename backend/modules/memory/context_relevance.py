"""
Context Relevance Selection Engine (CRSE)
==========================================
The missing reasoning layer between the Unified Cognitive Context and the LLM prompt.

Pipeline Position:
  User Message
  -> ConversationSpeechActEngine  (intent + speech act)
  -> UnifiedCognitiveContextEngine (full cognitive profile)
  -> >>> ContextRelevanceSelector <<<   <- THIS MODULE
  -> PromptBuilder (only relevant context)
  -> Analyst -> Sarvam

Responsibilities:
  1. Extract semantic signals from the current user message.
  2. Score every field of the UnifiedCognitiveProfile against those signals.
  3. Discard items below the relevance threshold.
  4. Assemble a slim, focused SelectedContextBlock for the prompt builder.

Scoring Factors (per context item):
  entity_match   0.40 weight
  topic_overlap  0.25 weight
  emotion_match  0.20 weight
  importance     0.10 weight
  recency        0.05 weight

Threshold Rules (by intent mode):
  EXPLICIT_RECALL    -> 0.00  (pass everything)
  EXPRESSING_EMOTION -> 0.55  (emotional history only)
  ASKING_FOR_ADVICE  -> 0.40  (goal + situation relevant only)
  default            -> 0.35  (balanced; entity/topic focused)
"""

import re
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from modules.memory.conversation_intent import ConversationIntentAnalysis, SpeechAct
from modules.memory.unified_context import UnifiedCognitiveProfile


TOPIC_DOMAINS: Dict[str, List[str]] = {
    "academic": [
        "exam", "exams", "test", "board", "boards", "jee", "neet", "study",
        "studying", "college", "university", "class", "marks", "grade",
        "assignment", "homework", "semester", "placement", "internship",
    ],
    "work": [
        "job", "work", "office", "manager", "boss", "salary", "promotion",
        "career", "meeting", "deadline", "project", "colleague", "startup",
        "business", "company", "interview",
    ],
    "relationship": [
        "friend", "friends", "girlfriend", "boyfriend", "partner", "crush",
        "family", "brother", "sister", "mother", "father", "parents", "wife",
        "husband", "marriage", "married", "wedding", "breakup", "broke up",
        "divorce", "fight", "argument",
    ],
    "emotional": [
        "lonely", "alone", "sad", "anxious", "anxiety", "stressed", "stress",
        "depressed", "depression", "overwhelmed", "scared", "worried",
        "happy", "excited", "proud", "hopeful", "angry", "frustrated",
        "hopeless", "empty", "numb", "lost",
    ],
    "goal": [
        "goal", "goals", "plan", "plans", "dream", "dreams", "ambition",
        "target", "achieve", "progress", "improve", "motivation", "habit",
    ],
    "health": [
        "sleep", "sleeping", "eat", "eating", "exercise", "gym", "fitness",
        "tired", "exhausted", "sick", "health",
    ],
    "financial": [
        "money", "debt", "loan", "savings", "expense", "budget", "afford",
        "financial", "rent", "bills",
    ],
    "life_event": [
        "got married", "passed away", "moved", "graduated",
        "new job", "lost job", "had a baby", "pregnant", "accident",
        "died", "death", "born", "birthday",
    ],
}

EMOTION_GROUPS: Dict[str, List[str]] = {
    "negative": [
        "sad", "depressed", "lonely", "alone", "anxious", "stressed",
        "overwhelmed", "scared", "hopeless", "empty", "numb", "hurt",
        "angry", "frustrated", "worthless", "lost", "confused",
    ],
    "positive": [
        "happy", "excited", "proud", "hopeful", "grateful", "joyful",
        "confident", "motivated", "peaceful", "calm", "relieved",
    ],
    "neutral": ["okay", "fine", "alright", "normal", "usual"],
}


@dataclass
class MessageSignals:
    raw_message: str
    named_entities: List[str] = field(default_factory=list)
    emotion_group: Optional[str] = None
    detected_emotion_words: List[str] = field(default_factory=list)
    topic_domains: List[str] = field(default_factory=list)
    topic_keywords: List[str] = field(default_factory=list)
    event_phrases: List[str] = field(default_factory=list)
    all_content_terms: List[str] = field(default_factory=list)


class MessageSignalExtractor:
    def extract(self, message: str, known_entities: Optional[List[str]] = None) -> MessageSignals:
        msg_lower = message.strip().lower()
        known_entities = known_entities or []
        signals = MessageSignals(raw_message=message)
        cleaned = re.sub(r"[^\w\s]", " ", msg_lower)
        signals.all_content_terms = [t for t in cleaned.split() if len(t) >= 3]

        words = message.split()
        for i, word in enumerate(words):
            stripped = re.sub(r"[^\w]", "", word)
            if len(stripped) >= 2 and stripped[0].isupper():
                if i > 0:
                    signals.named_entities.append(stripped)
                elif stripped in known_entities:
                    signals.named_entities.append(stripped)
        for ent in known_entities:
            if ent.lower() in msg_lower and ent not in signals.named_entities:
                signals.named_entities.append(ent)
        signals.named_entities = list(dict.fromkeys(signals.named_entities))

        for group, words_list in EMOTION_GROUPS.items():
            matched = [w for w in words_list if w in msg_lower]
            if matched:
                if signals.emotion_group is None:
                    signals.emotion_group = group
                signals.detected_emotion_words.extend(matched)

        detected_domains: List[str] = []
        detected_keywords: List[str] = []
        for domain, kw_list in TOPIC_DOMAINS.items():
            matched_kws = [kw for kw in kw_list if kw in msg_lower]
            if matched_kws:
                detected_domains.append(domain)
                detected_keywords.extend(matched_kws)
        signals.topic_domains = list(dict.fromkeys(detected_domains))
        signals.topic_keywords = list(dict.fromkeys(detected_keywords))

        event_kws = TOPIC_DOMAINS.get("life_event", [])
        signals.event_phrases = [e for e in event_kws if e in msg_lower]
        return signals


@dataclass
class ScoredItem:
    field_name: str
    value: str
    score: float
    score_breakdown: Dict[str, float] = field(default_factory=dict)


class ContextItemScorer:
    WEIGHTS = {
        "entity_match":  0.40,
        "topic_overlap": 0.25,
        "emotion_match": 0.20,
        "importance":    0.10,
        "recency":       0.05,
    }

    def score(self, field_name: str, value: str, signals: MessageSignals,
              importance_hint: float = 0.5, recency_hint: float = 0.5) -> ScoredItem:
        value_lower = value.strip().lower()
        value_terms = set(re.sub(r"[^\w\s]", " ", value_lower).split())
        breakdown: Dict[str, float] = {}

        entity_score = 0.0
        if signals.named_entities:
            for ent in signals.named_entities:
                if ent.lower() in value_lower:
                    entity_score = 1.0
                    break
            if entity_score < 1.0:
                msg_ent_terms = {e.lower() for e in signals.named_entities}
                if value_terms & msg_ent_terms:
                    entity_score = 0.70
        breakdown["entity_match"] = entity_score

        topic_score = 0.0
        if signals.topic_keywords:
            matched = sum(1 for kw in signals.topic_keywords if kw in value_lower)
            topic_score = min(1.0, matched / max(1, len(signals.topic_keywords)))
        elif signals.all_content_terms:
            msg_terms = set(signals.all_content_terms)
            if msg_terms:
                overlap = value_terms & msg_terms
                topic_score = min(1.0, len(overlap) / max(1, len(msg_terms)))
        breakdown["topic_overlap"] = round(topic_score, 4)

        emotion_score = 0.0
        if signals.detected_emotion_words:
            for ew in signals.detected_emotion_words:
                if ew in value_lower:
                    emotion_score = 1.0
                    break
            if emotion_score < 1.0 and signals.emotion_group:
                if any(tag in field_name for tag in ["emotional", "trigger", "emotion", "mood", "trend"]):
                    emotion_score = max(emotion_score, 0.75)
        breakdown["emotion_match"] = round(emotion_score, 4)
        breakdown["importance"] = round(importance_hint, 4)
        breakdown["recency"] = round(recency_hint, 4)

        total = sum(self.WEIGHTS[k] * v for k, v in breakdown.items())
        total = round(min(1.0, max(0.0, total)), 4)
        return ScoredItem(field_name=field_name, value=value, score=total, score_breakdown=breakdown)


@dataclass
class SelectedContextBlock:
    selection_mode: str
    threshold_applied: float
    persona_minimal: str
    selected_relationships: List[str] = field(default_factory=list)
    selected_facts: List[str] = field(default_factory=list)
    selected_goals: List[str] = field(default_factory=list)
    selected_emotional_history: List[str] = field(default_factory=list)
    selected_session_summary: Optional[str] = None
    selected_presenting_problem: Optional[str] = None
    items_before: int = 0
    items_after: int = 0
    chars_before: int = 0
    chars_after: int = 0
    selection_duration_ms: float = 0.0
    scored_items: List[ScoredItem] = field(default_factory=list)
    discarded_items: List[ScoredItem] = field(default_factory=list)

    def to_prompt_block(self) -> str:
        parts: List[str] = []
        parts.append(f"[USER] {self.persona_minimal}")

        if self.selection_mode == "EXPLICIT_RECALL":
            if self.selected_relationships:
                parts.append(f"[RELATIONSHIPS] {'; '.join(self.selected_relationships)}")
            if self.selected_facts:
                parts.append(f"[FACTS] {'; '.join(self.selected_facts)}")
            if self.selected_goals:
                parts.append(f"[GOALS] {'; '.join(self.selected_goals)}")
            if self.selected_emotional_history:
                parts.append(f"[EMOTIONAL HISTORY] {'; '.join(self.selected_emotional_history)}")
            if self.selected_presenting_problem:
                parts.append(f"[PRESENTING CONCERN] {self.selected_presenting_problem}")
            if self.selected_session_summary:
                parts.append(f"[RECENT SESSION] {self.selected_session_summary}")

        elif self.selection_mode == "EMOTIONAL":
            if self.selected_emotional_history:
                parts.append(f"[EMOTIONAL CONTEXT] {'; '.join(self.selected_emotional_history)}")
            if self.selected_relationships:
                parts.append(f"[RELEVANT PEOPLE] {'; '.join(self.selected_relationships[:2])}")

        elif self.selection_mode == "GOAL_FOCUSED":
            if self.selected_goals:
                parts.append(f"[GOALS] {'; '.join(self.selected_goals)}")
            if self.selected_facts:
                parts.append(f"[RELEVANT CONTEXT] {'; '.join(self.selected_facts[:2])}")

        else:
            if self.selected_relationships:
                parts.append(f"[RELEVANT PEOPLE] {'; '.join(self.selected_relationships)}")
            if self.selected_facts:
                parts.append(f"[RELEVANT CONTEXT] {'; '.join(self.selected_facts)}")

        result = "\n".join(parts)
        self.chars_after = len(result)
        return result

    def telemetry_summary(self) -> str:
        reduction = 0.0
        if self.chars_before > 0:
            reduction = round((1 - self.chars_after / self.chars_before) * 100, 1)
        return (
            f"mode={self.selection_mode} | threshold={self.threshold_applied} | "
            f"items={self.items_after}/{self.items_before} | "
            f"chars={self.chars_after}/{self.chars_before} | "
            f"reduction={reduction}% | "
            f"duration={self.selection_duration_ms}ms"
        )


class ContextRelevanceSelector:
    """
    Context Relevance Selection Engine.

    Inserted between UnifiedCognitiveContextEngine and the LLM prompt builder.
    Analyzes the user message, scores all profile items, and returns only the
    highest-relevance context for prompt injection.

    Usage:
        selector = ContextRelevanceSelector()
        selection = selector.select(
            message=req.message,
            intent=intent_analysis,
            profile=unified_profile,
            known_entities=list(known_ents),
        )
        memory_context = selection.to_prompt_block()
        print("[CRSE]", selection.telemetry_summary())
    """

    THRESHOLD_BY_MODE = {
        "EXPLICIT_RECALL":   0.00,
        "EMOTIONAL":         0.55,   # but emotional_triggers+trend bypass threshold
        "ASKING_FOR_ADVICE": 0.40,
        "ENTITY_FOCUSED":    0.30,
        "GOAL_FOCUSED":      0.35,
        "TOPIC_FOCUSED":     0.20,   # direct topic keyword match in content
        "GENERAL":           0.35,
    }

    def __init__(self):
        self._extractor = MessageSignalExtractor()
        self._scorer = ContextItemScorer()

    def select(self, message: str, intent: ConversationIntentAnalysis,
               profile: UnifiedCognitiveProfile,
               known_entities: Optional[List[str]] = None) -> SelectedContextBlock:
        start = time.time()
        known_entities = known_entities or []

        mode = self._resolve_mode(intent, message)
        signals = self._extractor.extract(message, known_entities=known_entities)
        threshold = self.THRESHOLD_BY_MODE.get(mode, 0.35)

        full_block = profile.to_formatted_context_block(max_tokens=800)
        chars_before = len(full_block)
        persona_minimal = f"Name: {profile.preferred_name} | Style: {profile.conversation_style}"

        all_scored: List[ScoredItem] = []
        all_scored.extend(self._score_list(profile.relationships, "relationships", signals, 0.75, 0.60))
        all_scored.extend(self._score_list(profile.personal_facts, "personal_facts", signals, 0.60, 0.55))
        all_scored.extend(self._score_list(profile.active_goals + profile.goals, "goals", signals, 0.70, 0.65))
        all_scored.extend(self._score_list(profile.habits_and_routines, "habits", signals, 0.40, 0.40))
        all_scored.extend(self._score_list(profile.long_term_preferences, "preferences", signals, 0.30, 0.30))
        all_scored.extend(self._score_list(profile.emotional_triggers, "emotional_triggers", signals, 0.65, 0.55))

        if profile.recent_emotional_trend:
            all_scored.append(self._scorer.score(
                "emotional_trend", f"Recent emotion: {profile.recent_emotional_trend}",
                signals, importance_hint=0.70, recency_hint=0.85))
        if profile.recent_session_summaries:
            all_scored.append(self._scorer.score(
                "session_summary", profile.recent_session_summaries[0],
                signals, importance_hint=0.65, recency_hint=0.80))
        if profile.presenting_problem:
            all_scored.append(self._scorer.score(
                "presenting_problem", profile.presenting_problem,
                signals, importance_hint=0.80, recency_hint=0.50))

        items_before = len(all_scored)

        # Mode-specific override rules:
        # 1. EMOTIONAL: always include emotional history items (triggers + trend)
        #    regardless of threshold — the user's emotional state is always relevant context.
        # 2. TOPIC_FOCUSED: any item whose content contains a topic keyword from the message
        #    passes regardless of threshold (direct content-keyword match).
        def _passes_threshold(item: ScoredItem) -> bool:
            if item.score >= threshold:
                return True
            if mode == "EMOTIONAL" and item.field_name in ("emotional_triggers", "emotional_trend"):
                return True  # Emotional history always relevant in emotional turns
            if mode in ("TOPIC_FOCUSED", "GENERAL") and signals.topic_keywords:
                # Direct keyword match in content = pass even if score is low
                val_lower = item.value.lower()
                if any(kw in val_lower for kw in signals.topic_keywords):
                    return True
            return False

        passed = sorted([s for s in all_scored if _passes_threshold(s)], key=lambda x: x.score, reverse=True)
        discarded = [s for s in all_scored if not _passes_threshold(s)]

        block = SelectedContextBlock(
            selection_mode=mode,
            threshold_applied=threshold,
            persona_minimal=persona_minimal,
            items_before=items_before,
            items_after=len(passed),
            chars_before=chars_before,
            scored_items=passed,
            discarded_items=discarded,
            selection_duration_ms=round((time.time() - start) * 1000, 2),
        )

        for item in passed:
            fname = item.field_name
            if fname == "relationships":
                block.selected_relationships.append(item.value)
            elif fname == "personal_facts":
                block.selected_facts.append(item.value)
            elif fname == "goals":
                block.selected_goals.append(item.value)
            elif fname == "habits":
                block.selected_facts.append(item.value)
            elif fname in ("emotional_triggers", "emotional_trend"):
                block.selected_emotional_history.append(item.value)
            elif fname == "session_summary":
                block.selected_session_summary = item.value
            elif fname == "presenting_problem":
                block.selected_presenting_problem = item.value
            elif fname == "preferences" and item.score >= 0.55:
                block.selected_facts.append(item.value)

        if mode == "EXPLICIT_RECALL":
            if profile.presenting_problem and not block.selected_presenting_problem:
                block.selected_presenting_problem = profile.presenting_problem
            if profile.primary_goal:
                goal_str = f"Primary Goal: {profile.primary_goal}"
                if goal_str not in block.selected_goals:
                    block.selected_goals.insert(0, goal_str)
            for g in (profile.goals or []):
                if g not in block.selected_goals:
                    block.selected_goals.append(g)
            if profile.recent_emotional_trend:
                trend_str = f"Recent emotion: {profile.recent_emotional_trend}"
                if trend_str not in block.selected_emotional_history:
                    block.selected_emotional_history.append(trend_str)

        block.to_prompt_block()
        return block

    def _resolve_mode(self, intent: ConversationIntentAnalysis, message: str) -> str:
        if intent.is_explicit_recall:
            return "EXPLICIT_RECALL"
        if intent.speech_act == SpeechAct.EXPRESSING_EMOTION:
            return "EMOTIONAL"
        if intent.speech_act == SpeechAct.ASKING_FOR_ADVICE:
            return "ASKING_FOR_ADVICE"
        if intent.extracted_entities:
            return "ENTITY_FOCUSED"
        msg_lower = message.lower()
        if any(t in msg_lower for t in TOPIC_DOMAINS.get("goal", [])):
            return "GOAL_FOCUSED"
        # Topic-focused: message contains clear domain keywords (academic, work, health, financial)
        topic_domains_to_check = ["academic", "work", "health", "financial", "life_event"]
        for domain in topic_domains_to_check:
            if any(kw in msg_lower for kw in TOPIC_DOMAINS.get(domain, [])):
                return "TOPIC_FOCUSED"
        return "GENERAL"

    def _score_list(self, items: List[str], field_name: str, signals: MessageSignals,
                    importance_hint: float = 0.5, recency_hint: float = 0.5) -> List[ScoredItem]:
        scored: List[ScoredItem] = []
        for item in items:
            if not item or not item.strip():
                continue
            s = self._scorer.score(field_name=field_name, value=item, signals=signals,
                                   importance_hint=importance_hint, recency_hint=recency_hint)
            scored.append(s)
        return scored
