import os
import sys
import unittest

# Set paths
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from modules.memory.unified_context import UnifiedCognitiveProfile, UnifiedCognitiveContextEngine
from modules.memory.context_relevance import ContextRelevanceSelector
from modules.memory.conversation_intent import ConversationIntentAnalysis, SpeechAct

def test_context_relevance_includes_both():
    print("Testing ContextRelevanceSelector with recent summaries + long term facts...")
    
    # 1. Create a profile with old established facts and recent conversation summaries
    profile = UnifiedCognitiveProfile(
        user_id=1,
        preferred_name="Aarav",
        conversation_style="Warm & Direct",
        relationships=["Older sister Priya who lives in Delhi", "Met a girl named Meera at library yesterday"],
        personal_facts=["Works as a Software Engineer at TechCorp", "Practiced guitar for 30 minutes this morning"],
        active_goals=["Prepare for IELTS exam", "Manage work stress"],
        recent_session_summaries=["Last session topics: Job interview prep. Notes: Felt anxious about system design."],
        recent_emotional_trend="Hopeful and relieved"
    )

    selector = ContextRelevanceSelector()
    intent = ConversationIntentAnalysis(
        speech_act=SpeechAct.SHARING_INFO,
        is_memory_needed=True,
        is_explicit_recall=False,
        extracted_entities=["Meera"]
    )

    # 2. Run selection for a normal user turn
    user_message = "I was talking to Meera today about my job interview."
    selection = selector.select(
        message=user_message,
        intent=intent,
        profile=profile,
        known_entities=["Meera", "Priya", "Aarav"]
    )

    prompt_block = selection.to_prompt_block()
    print("\n--- GENERATED PROMPT BLOCK ---")
    print(prompt_block)
    print("------------------------------\n")

    # Assertions
    assert "[RECENT CONVERSATION & CONTEXT]" in prompt_block, "Recent conversation context missing from prompt block!"
    assert "Job interview prep" in prompt_block, "Recent session topic missing from prompt block!"
    assert "Meera" in prompt_block, "Relevant recent relationship missing!"
    print("[OK] ContextRelevanceSelector successfully outputted BOTH recent context and relevant facts!")

if __name__ == "__main__":
    test_context_relevance_includes_both()
    print("\nALL MEMORY VERIFICATION TESTS PASSED SUCCESSFULLY!")
