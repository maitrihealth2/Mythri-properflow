import os
import sys
import pathlib

# Set up paths
backend_dir = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from core.database.models import (
    SessionLocal, User, UserProfile, UserOnboarding, Session,
    Message, CompanionMemory, SessionSummary, LivingUserContext
)
from modules.memory.short_term import short_term_engine, WorkingMemoryKind
from modules.memory.unified_context import UnifiedCognitiveContextEngine, UnifiedCognitiveProfile
from modules.memory.context_relevance import ContextRelevanceSelector
from modules.memory.conversation_intent import ConversationSpeechActEngine


def test_3tier_memory_system():
    print("==================================================")
    print("    RUNNING 3-TIER COGNITIVE MEMORY TEST SUITE    ")
    print("==================================================")

    db = SessionLocal()
    try:
        # 1. Ensure a test user exists
        test_user = db.query(User).filter(User.email == "test_3tier_mem@example.com").first()
        if not test_user:
            test_user = User(
                username="Aarav_Tester",
                email="test_3tier_mem@example.com",
                hashed_password="test_hashed_pw",
                preferred_language="en-IN"
            )
            db.add(test_user)
            db.flush()
            print(f"[Setup] Created test user id={test_user.id}")

        uid = test_user.id

        # 2. Add Onboarding & Profile
        onb = db.query(UserOnboarding).filter(UserOnboarding.user_id == uid).first()
        if not onb:
            onb = UserOnboarding(
                user_id=uid,
                preferred_name="Aarav",
                conversation_style="Warm & Direct",
                communication_mode="Both",
                summary="Aarav is preparing for software engineering interviews."
            )
            db.add(onb)

        # 3. Add Long-Term Memories (Core Profile Facts & Relationships)
        existing_mems = db.query(CompanionMemory).filter(CompanionMemory.user_id == uid).count()
        if existing_mems < 3:
            db.add(CompanionMemory(user_id=uid, memory_type="relationship", content="Sister named Ananya who is a doctor", importance_score=0.9))
            db.add(CompanionMemory(user_id=uid, memory_type="fact", content="Works as a frontend developer at a tech company", importance_score=0.85))
            db.add(CompanionMemory(user_id=uid, memory_type="trigger", content="Panic triggered by coding tests with strict countdown timers", importance_score=0.95))
            db.add(CompanionMemory(user_id=uid, memory_type="preference", content="Prefers structured practical tips over general advice", importance_score=0.7))

        # 4. Add Past Session with Deep Historical Message (Spoken Long Back)
        old_sess = db.query(Session).filter(Session.user_id == uid, Session.channel == "test_old_channel").first()
        if not old_sess:
            old_sess = Session(
                user_id=uid,
                session_token="old_session_token_123",
                channel="test_old_channel",
                session_status="completed"
            )
            db.add(old_sess)
            db.flush()
            
            # Message spoken long ago in old session
            db.add(Message(
                session_id=old_sess.id,
                role="user",
                content="Last month I had a huge argument with my manager regarding the project deadline."
            ))
            
            # Summary for this past session (Short-Term Memory)
            db.add(SessionSummary(
                session_id=old_sess.id,
                user_id=uid,
                main_topics=["Manager conflict", "Workplace pressure"],
                emotional_progression=["Stressed", "Calmer"],
                important_context="Discussed boundary setting with manager; practiced breathing exercise.",
                unresolved_topics=["Follow up on 1-on-1 meeting outcome"]
            ))

        # 5. Create Active Live Session (Episodic Memory)
        active_sess = db.query(Session).filter(Session.user_id == uid, Session.session_status == "active").first()
        if not active_sess:
            active_sess = Session(
                user_id=uid,
                session_token="active_test_sess_456",
                channel="web",
                session_status="active",
                conversation_goal="Manage interview anxiety today",
                dominant_emotion="anxious"
            )
            db.add(active_sess)
            db.flush()

        # Add live working memory items into short_term_engine for the active session
        short_term_engine.add_item(
            session_id=active_sess.id,
            user_id=uid,
            kind=WorkingMemoryKind.EMOTIONAL_STATE,
            content="mildly anxious about upcoming coding round"
        )
        short_term_engine.add_item(
            session_id=active_sess.id,
            user_id=uid,
            kind=WorkingMemoryKind.ACTIVE_TOPIC,
            content="system design interview preparation"
        )
        short_term_engine.add_item(
            session_id=active_sess.id,
            user_id=uid,
            kind=WorkingMemoryKind.TURN_FACT,
            content="User has an interview scheduled for tomorrow at 2 PM"
        )

        db.commit()

        # 6. Test UnifiedCognitiveContextEngine
        engine = UnifiedCognitiveContextEngine()
        user_query = "Do you remember the issue I had with my manager regarding the project?"
        profile = engine.build_context(db, user_id=uid, session_id=active_sess.id, query=user_query)

        print("\n--- [TEST 1: 3-Tier Profile Extraction Verification] ---")
        print(f"Preferred Name: {profile.preferred_name}")
        print(f"Tier 1 (Episodic Live Topics): {profile.current_session_topics}")
        print(f"Tier 1 (Episodic Live Emotion): {profile.current_session_emotion}")
        print(f"Tier 1 (Episodic Working Notes): {profile.current_session_working_facts}")
        print(f"Tier 2 (Short-Term Summaries Count): {len(profile.recent_session_summaries)}")
        print(f"Tier 3 (Long-Term Facts Count): {len(profile.personal_facts)}")
        print(f"Tier 3 (Long-Term Deep Past Recall): {profile.historical_spoken_content}")

        assert len(profile.current_session_topics) > 0, "Episodic live topics must not be empty"
        assert len(profile.recent_session_summaries) > 0, "Short-term past summaries must not be empty"
        assert len(profile.personal_facts) > 0, "Long-term facts must not be empty"
        assert len(profile.historical_spoken_content) > 0, "Deep historical spoken content should match user query"
        print("[PASS] Test 1: All 3 memory tiers successfully populated.")

        # 7. Test to_formatted_context_block output
        print("\n--- [TEST 2: Prompt Formatter 3-Tier Output] ---")
        prompt_block = profile.to_formatted_context_block(max_tokens=600)
        print(prompt_block)

        assert "[EPISODIC MEMORY (CURRENT SESSION - LIVE)]" in prompt_block
        assert "[SHORT-TERM MEMORY (RECENT TIMES & SESSIONS)]" in prompt_block
        assert "[LONG-TERM MEMORY (HISTORICAL CONTENT & CORE PROFILE)]" in prompt_block
        assert "Aarav" in prompt_block
        print("[PASS] Test 2: Formatted context block contains all 3 explicit tiers.")

        # 8. Test ContextRelevanceSelector with User Query
        print("\n--- [TEST 3: Context Relevance Selector Verification] ---")
        speech_engine = ConversationSpeechActEngine()
        intent = speech_engine.analyze(user_query, known_entities=["Aarav", "Ananya"])
        crse = ContextRelevanceSelector()
        selected = crse.select(user_query, intent, profile, known_entities=["Aarav", "Ananya"])
        final_prompt_block = selected.to_prompt_block()

        print(f"Selection Mode: {selected.selection_mode}")
        print(f"Reduction: {selected.chars_after}/{selected.chars_before} chars")
        print("\nFinal Formatted Block:\n" + final_prompt_block)

        assert "[EPISODIC MEMORY (CURRENT SESSION - LIVE)]" in final_prompt_block or "[SHORT-TERM MEMORY" in final_prompt_block or "[LONG-TERM MEMORY" in final_prompt_block
        print("[PASS] Test 3: Context Relevance Selector output formatted correctly.")

        print("\n==================================================")
        print("     ALL 3-TIER MEMORY TESTS PASSED (100%)       ")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    test_3tier_memory_system()
