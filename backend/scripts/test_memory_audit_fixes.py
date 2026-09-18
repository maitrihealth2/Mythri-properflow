"""
Comprehensive Verification Script for Memory Subsystem Audit Fixes.
Tests:
1. Regex & Pattern Extraction (Names, Goals, Preferences, Relationships, Facts)
2. Quality Policy thresholds
3. Working Memory retention in ShortTermMemoryEngine
4. Speech Act Intent Analysis (Recall, Emotion, Advice, Entities)
5. Context Relevance Selection (Prompt Block construction with Long-term & Recent context)
"""
import os
import sys

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from modules.memory.extractor import MemoryExtractor
from modules.memory.domain import MemoryCategory
from modules.memory.policies import MemoryQualityPolicy
from modules.memory.short_term import ShortTermMemoryEngine, WorkingMemoryKind
from modules.memory.conversation_intent import ConversationSpeechActEngine, SpeechAct
from modules.memory.context_relevance import ContextRelevanceSelector
from modules.memory.unified_context import UnifiedCognitiveProfile


def test_fact_extraction():
    print("\n--- TEST 1: Fact Extraction Across Natural Language Statements ---")
    extractor = MemoryExtractor()

    test_cases = [
        ("My name is Farhan", MemoryCategory.FACT, "name"),
        ("Call me Alex", MemoryCategory.FACT, "alex"),
        ("My goal is to run a marathon", MemoryCategory.GOAL, "marathon"),
        ("I want to learn Spanish", MemoryCategory.GOAL, "spanish"),
        ("I live in Bangalore", MemoryCategory.FACT, "bangalore"),
        ("I work as a Software Architect at Acme", MemoryCategory.FACT, "architect"),
        ("My favorite color is deep blue", MemoryCategory.PREFERENCE, "color"),
        ("I love black coffee", MemoryCategory.PREFERENCE, "coffee"),
        ("My sister Maya lives in London", MemoryCategory.RELATIONSHIP, "maya"),
        ("My friend Rahul got married", MemoryCategory.RELATIONSHIP, "rahul"),
        ("I feel anxious when speaking in public", MemoryCategory.TRIGGER, "anxious"),
        ("Every morning I practice meditation for 20 minutes", MemoryCategory.HABIT, "meditation"),
    ]

    for utterance, expected_category, expected_keyword in test_cases:
        candidates = extractor.extract_candidates(utterance, user_id=1, session_id=100)
        assert len(candidates) > 0, f"FAILED to extract candidate for: '{utterance}'"
        
        matched_category = candidates[0].category
        assert matched_category == expected_category, (
            f"Expected category {expected_category} for '{utterance}', got {matched_category}"
        )
        assert expected_keyword.lower() in candidates[0].extracted_fact.lower(), (
            f"Expected keyword '{expected_keyword}' in extracted fact '{candidates[0].extracted_fact}'"
        )
        print(f"  [PASS] '{utterance}' -> Category: {matched_category.value}, Fact: '{candidates[0].extracted_fact}'")

    print("[SUCCESS] All extraction pattern tests passed!")


def test_quality_policy():
    print("\n--- TEST 2: Quality Policy Validation ---")
    
    # Valid short statements (should pass with relaxed thresholds)
    valid_short = ["I am Ali", "I love tea", "I live in Pune"]
    for s in valid_short:
        assert MemoryQualityPolicy.should_extract(s) is True, f"Policy rejected valid short statement: '{s}'"
        print(f"  [PASS] Accepted: '{s}'")

    # Pure trivial filler / greetings (should be filtered)
    trivial = ["hi", "hello", "ok", "cool", "yeah", "k"]
    for t in trivial:
        assert MemoryQualityPolicy.should_extract(t) is False, f"Policy allowed trivial phrase: '{t}'"
        print(f"  [PASS] Correctly filtered: '{t}'")

    print("[SUCCESS] Quality policy tests passed!")


def test_working_memory_retention():
    print("\n--- TEST 3: Working Memory Retention Across Turns ---")
    engine = ShortTermMemoryEngine()
    session_id = 42
    user_id = 99

    # Turn 1
    engine.add_item(session_id, user_id, WorkingMemoryKind.TURN_FACT, "I work on backend systems")
    # Turn 2
    engine.add_item(session_id, user_id, WorkingMemoryKind.TURN_FACT, "I am feeling stressed about deadlines")
    # Turn 3
    engine.add_item(session_id, user_id, WorkingMemoryKind.ACTIVE_TOPIC, "work deadlines")

    session = engine.read_working_memory(session_id)
    assert session is not None, "Working memory session not found!"
    assert len(session.active_items) == 3, f"Expected 3 active items, found {len(session.active_items)}"
    print(f"  [PASS] Working memory retained {len(session.active_items)} items across conversational turns.")
    print("[SUCCESS] Working memory test passed!")


def test_intent_analysis():
    print("\n--- TEST 4: Conversation Speech Act & Intent Analysis ---")
    speech_engine = ConversationSpeechActEngine()

    recall_queries = [
        "Do you remember where I live?",
        "What is my goal?",
        "What do you know about me?",
        "Do you know my sister's name?",
        "What's my job?",
    ]

    for q in recall_queries:
        intent = speech_engine.analyze(q)
        assert intent.is_explicit_recall is True, f"Failed explicit recall check for: '{q}'"
        assert intent.is_memory_needed is True, f"is_memory_needed was False for: '{q}'"
        print(f"  [PASS] Recall query recognized: '{q}' -> mode=EXPLICIT_RECALL")

    # Emotional expression
    emo_intent = speech_engine.analyze("I am feeling overwhelmed with everything today")
    assert emo_intent.speech_act == SpeechAct.EXPRESSING_EMOTION
    assert emo_intent.is_memory_needed is True, "Memory should be enabled for emotional support context"
    print(f"  [PASS] Emotional query recognized with memory support enabled: '{emo_intent.reasoning}'")

    # Advice request
    adv_intent = speech_engine.analyze("What should I do about my difficult conversation with my manager?")
    assert adv_intent.speech_act == SpeechAct.ASKING_FOR_ADVICE
    assert adv_intent.is_memory_needed is True, "Memory should be enabled for advice context"
    print(f"  [PASS] Advice query recognized with memory support enabled: '{adv_intent.reasoning}'")

    print("[SUCCESS] Intent analysis tests passed!")


def test_context_relevance_selection():
    print("\n--- TEST 5: Context Relevance Selection & Prompt Building ---")
    profile = UnifiedCognitiveProfile(
        user_id=1,
        preferred_name="Farhan",
        conversation_style="Warm & Attuned",
        relationships=["Older sister Maya who lives in London", "Close friend Rahul"],
        personal_facts=["Works as a Software Architect at Acme Corp", "Lives in Bangalore"],
        active_goals=["Run a half marathon", "Learn Spanish"],
        long_term_preferences=["Prefers black coffee with no sugar"],
        emotional_triggers=["Feels anxious during public presentations"],
        recent_session_summaries=["Prior session topics: Public speaking anxiety. Notes: Practiced box breathing technique."],
        recent_emotional_trend="Calm and reflective"
    )

    selector = ContextRelevanceSelector()
    speech_engine = ConversationSpeechActEngine()

    # Query 1: Explicit recall
    q1 = "What is my goal and where do I live?"
    intent1 = speech_engine.analyze(q1)
    selection1 = selector.select(q1, intent1, profile, known_entities=["Maya", "Rahul", "Farhan"])
    block1 = selection1.to_prompt_block()
    
    assert "[GOALS]" in block1, "Goals missing from recall prompt block"
    assert "[FACTS]" in block1, "Facts missing from recall prompt block"
    assert "Bangalore" in block1, "City fact missing from recall prompt block"
    assert "marathon" in block1.lower(), "Goal missing from recall prompt block"
    print(f"  [PASS] Prompt block for recall query successfully assembled:\n{block1}\n")

    # Query 2: Emotional distress (should include recent summary + emotional trigger + relationships)
    q2 = "I'm having a lot of anxiety before my team presentation today."
    intent2 = speech_engine.analyze(q2)
    selection2 = selector.select(q2, intent2, profile, known_entities=["Maya", "Rahul", "Farhan"])
    block2 = selection2.to_prompt_block()

    assert "[RECENT CONVERSATION & CONTEXT]" in block2, "Recent conversation context missing from emotional turn"
    assert "[EMOTIONAL CONTEXT]" in block2 or "[EMOTIONAL HISTORY]" in block2, "Emotional triggers missing from emotional turn"
    print(f"  [PASS] Prompt block for emotional turn successfully assembled:\n{block2}\n")

    print("[SUCCESS] Context relevance selection tests passed!")


if __name__ == "__main__":
    test_fact_extraction()
    test_quality_policy()
    test_working_memory_retention()
    test_intent_analysis()
    test_context_relevance_selection()
    print("\n=======================================================")
    print("ALL AUDIT FIX TESTS COMPLETED AND VERIFIED SUCCESSFULLY!")
    print("=======================================================\n")
