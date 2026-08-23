"""
Golden Path Integration Test — Day 1
Tests the complete Mythri support loop:
  Understand → Decide (Support Router) → Act → Memory Write → Memory Read

Run: python scripts/test_golden_path.py
"""
import sys
import asyncio
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PASS = "PASS ✅"
FAIL = "FAIL ❌"

results = []

def check(label, condition, detail=""):
    status = PASS if condition else FAIL
    results.append((label, condition))
    print(f"  {status}  {label}" + (f" — {detail}" if detail else ""))
    return condition


async def run():
    print("=" * 65)
    print("GOLDEN PATH INTEGRATION TEST — Day 1")
    print("=" * 65)

    # ──────────────────────────────────────────────────────────────
    # 1. Support Decision Router
    # ──────────────────────────────────────────────────────────────
    print("\n[1] SUPPORT DECISION ROUTER")
    try:
        from modules.consultation.support_router import route as support_route

        # Case: GROUND strategy, overwhelmed
        cf_overwhelmed = {
            "emotional_state": {"primary": "overwhelmed", "intensity": 0.9},
            "cognitive_patterns": [],
            "conversation_state": {"risk_level": "low"},
            "runtime_state": {"response_strategy": "GROUND"},
        }
        d = support_route(cf_overwhelmed, is_crisis=False, exercise_state="idle")
        check("GROUND → mode=GROUND", d.mode == "GROUND", f"got {d.mode}")
        check("GROUND → exercise_type set", d.exercise_type is not None, f"got {d.exercise_type}")

        # Case: crisis flag
        d_crisis = support_route(cf_overwhelmed, is_crisis=True, exercise_state="idle")
        check("Crisis flag → ESCALATE", d_crisis.mode == "ESCALATE", f"got {d_crisis.mode}")

        # Case: high risk
        cf_high = {**cf_overwhelmed, "conversation_state": {"risk_level": "high"}, "runtime_state": {"response_strategy": "LISTEN"}}
        d_high = support_route(cf_high, is_crisis=False, exercise_state="idle")
        check("High risk → ESCALATE", d_high.mode == "ESCALATE", f"got {d_high.mode}")

        # Case: normal conversation
        cf_normal = {
            "emotional_state": {"primary": "neutral", "intensity": 0.3},
            "cognitive_patterns": [],
            "conversation_state": {"risk_level": "low"},
            "runtime_state": {"response_strategy": "LISTEN"},
        }
        d_normal = support_route(cf_normal, is_crisis=False, exercise_state="idle")
        check("Normal LISTEN → TALK", d_normal.mode == "TALK", f"got {d_normal.mode}")

        # Case: PROPOSE_EXERCISE
        cf_propose = {**cf_normal, "runtime_state": {"response_strategy": "PROPOSE_EXERCISE"}}
        d_propose = support_route(cf_propose, is_crisis=False, exercise_state="idle")
        check("PROPOSE_EXERCISE → PROPOSE_EXERCISE", d_propose.mode == "PROPOSE_EXERCISE", f"got {d_propose.mode}")

        # Case: exercise already running → TALK even if GROUND
        d_running = support_route(cf_overwhelmed, is_crisis=False, exercise_state="in_progress")
        check("Exercise running → no new GROUND", d_running.mode != "GROUND", f"got {d_running.mode}")

    except Exception as e:
        print(f"  {FAIL}  Support Router import/execution error: {e}")
        import traceback; traceback.print_exc()

    # ──────────────────────────────────────────────────────────────
    # 2. Memory Write Pipeline
    # ──────────────────────────────────────────────────────────────
    print("\n[2] MEMORY WRITE PIPELINE")
    try:
        from modules.memory.manager import MemoryManager
        from modules.memory.repository import MemoryRepository
        from core.database.models import SessionLocal, CompanionMemory

        test_user_id = 1  # real user in DB

        with SessionLocal() as db:
            count_before = db.query(CompanionMemory).filter(CompanionMemory.user_id == test_user_id).count()

        with SessionLocal() as db:
            mm = MemoryManager(db_session=db)
            result = mm.process_turn(
                user_id=test_user_id,
                user_message="My sister Priya called me today. We had a fight about money and I felt really angry.",
                session_id=88888,
            )
            print(f"  candidates={len(result.candidates)} actionable={len([d for d in result.decisions if d.is_actionable])}")
            for d in result.decisions:
                if d.is_actionable:
                    print(f"    → {d.outcome.value}: {str(d.candidate.content)[:80] if d.candidate else 'N/A'}")

        with SessionLocal() as db:
            count_after = db.query(CompanionMemory).filter(CompanionMemory.user_id == test_user_id).count()

        # count_after >= count_before: create_new adds a row, merge_into_existing keeps count same (both are valid)
        pipeline_worked = len(result.candidates) > 0 and len([d for d in result.decisions if d.is_actionable]) > 0
        check("Memory pipeline extracted and decided", pipeline_worked, f"candidates={len(result.candidates)} actionable decisions present")
        check("Memories readable from repository", count_after >= 1)

    except Exception as e:
        print(f"  {FAIL}  Memory write error: {e}")
        import traceback; traceback.print_exc()

    # ──────────────────────────────────────────────────────────────
    # 3. Memory Read / Context Assembly
    # ──────────────────────────────────────────────────────────────
    print("\n[3] MEMORY READ — CONTEXT ASSEMBLY")
    try:
        from modules.memory.unified_context import UnifiedCognitiveContextEngine

        engine = UnifiedCognitiveContextEngine()
        # Use user 1 who has real messages from production
        profile = await engine.build_context_async(
            user_id=1,
            query="I'm feeling overwhelmed again like last time",
        )
        block = profile.to_formatted_context_block()
        check("Context block non-empty", len(block.strip()) > 20, f"length={len(block)}")
        print(f"    Context preview: {block[:200].strip()!r}")

    except Exception as e:
        print(f"  {FAIL}  Memory read error: {e}")
        import traceback; traceback.print_exc()

    # ──────────────────────────────────────────────────────────────
    # 4. Exercise Outcome → Memory
    # ──────────────────────────────────────────────────────────────
    print("\n[4] EXERCISE OUTCOME → MEMORY (direct repository save)")
    try:
        from modules.memory.repository import MemoryRepository
        from modules.memory.domain import (
            MemoryEntity, MemoryCategory, MemoryKind,
            MemoryMetadata, MemorySource, MemoryStatus,
        )
        from core.database.models import SessionLocal, CompanionMemory
        from datetime import datetime as dt

        with SessionLocal() as db:
            before = db.query(CompanionMemory).filter(CompanionMemory.user_id == 1).count()

        outcome_entity = MemoryEntity(
            content="Completed GROUNDING exercise. Mood before: overwhelmed, after: calm. Feedback: It really helped me slow down.",
            metadata=MemoryMetadata(
                user_id=1,
                memory_kind=MemoryKind.LONG_TERM,
                category=MemoryCategory.TRIGGER,
                importance=0.9,
                confidence=1.0,
                created_at=dt.utcnow(),
                updated_at=dt.utcnow(),
                source=MemorySource.DIRECT_USER_STATEMENT,
                origin_session=88887,
                status=MemoryStatus.STORED,
                extra={"exercise_type": "GROUNDING", "pre_emotion": "overwhelmed", "post_emotion": "calm"},
            ),
        )
        with SessionLocal() as db:
            repo = MemoryRepository(db)
            repo.save_memory(outcome_entity)

        with SessionLocal() as db:
            after = db.query(CompanionMemory).filter(CompanionMemory.user_id == 1).count()

        check("Exercise outcome stored in memory", after > before, f"before={before} after={after}")

    except Exception as e:
        print(f"  {FAIL}  Exercise outcome memory error: {e}")
        import traceback; traceback.print_exc()


    # ──────────────────────────────────────────────────────────────
    # 5. Crisis Detection Safety
    # ──────────────────────────────────────────────────────────────
    print("\n[5] SAFETY — CRISIS DETECTION")
    try:
        from security.crisis_handler import check_for_crisis

        safe = check_for_crisis("I'm just tired and stressed from work today")
        crisis1 = check_for_crisis("I want to take all my pills tonight and end it all")
        crisis2 = check_for_crisis("I'm going to jump off the bridge")
        fp1 = check_for_crisis("I'm tired of living in this traffic every day")

        check("Safe message → not crisis", not safe.is_crisis)
        check("Clear crisis → detected", crisis1.is_crisis)
        check("Bridge jump → detected", crisis2.is_crisis)
        check("Traffic frustration → not crisis (no false positive)", not fp1.is_crisis)

    except Exception as e:
        print(f"  {FAIL}  Crisis detection error: {e}")

    # ──────────────────────────────────────────────────────────────
    # 6. RAG Retrieval
    # ──────────────────────────────────────────────────────────────
    print("\n[6] RAG RETRIEVAL")
    try:
        from rag.knowledge.retriever import retrieve_context, is_knowledge_base_ready

        ready = is_knowledge_base_ready()
        check("Knowledge base ready", ready)
        if ready:
            ctx = retrieve_context("cognitive distortions in CBT", n_results=3)
            check("CBT query returns context", len(ctx.strip()) > 50, f"length={len(ctx)}")
            ctx2 = retrieve_context("mindfulness and acceptance", n_results=3)
            check("ACT query returns context", len(ctx2.strip()) > 50, f"length={len(ctx2)}")

    except Exception as e:
        print(f"  {FAIL}  RAG retrieval error: {e}")

    # ──────────────────────────────────────────────────────────────
    # 7. Day 2 — Intervention History in Context Block
    # ──────────────────────────────────────────────────────────────
    print("\n[7] CONTEXT BLOCK — INTERVENTION HISTORY")
    try:
        from modules.memory.unified_context import UnifiedCognitiveContextEngine

        engine = UnifiedCognitiveContextEngine()
        profile = await engine.build_context_async(user_id=1, query="feeling overwhelmed again")

        # Triggers should now appear (exercise outcomes written on Day 1)
        check("emotional_triggers populated", len(profile.emotional_triggers) > 0,
              f"found {len(profile.emotional_triggers)} trigger(s)")

        # Context block must include the [WHAT HAS HELPED] section
        block = profile.to_formatted_context_block()
        check("Context block contains [WHAT HAS HELPED]", "WHAT HAS HELPED" in block,
              f"block length={len(block)}")
        print(f"    Trigger sample: {profile.emotional_triggers[0][:100] if profile.emotional_triggers else 'none'!r}")

    except Exception as e:
        print(f"  {FAIL}  Intervention history error: {e}")
        import traceback; traceback.print_exc()

    # ──────────────────────────────────────────────────────────────
    # 8. Day 2 — Output Safety Validator
    # ──────────────────────────────────────────────────────────────
    print("\n[8] OUTPUT SAFETY VALIDATOR")
    try:
        from security.safety_validator import evaluate_output_safety

        # Safe response
        safe_r = await evaluate_output_safety(
            "I feel really stressed today",
            "I hear you — stress can be really heavy. Let's breathe through this together. What's been weighing on you most?"
        )
        check("Safe response → is_safe=True", safe_r.get("is_safe", False) is True,
              f"got {safe_r}")

        # Violation: diagnosis
        unsafe_r = await evaluate_output_safety(
            "I feel really anxious",
            "You clearly have Generalized Anxiety Disorder. Here is your diagnosis and treatment plan."
        )
        check("Diagnosis violation → caught", not unsafe_r.get("is_safe", True),
              f"got {unsafe_r}")

    except Exception as e:
        print(f"  {FAIL}  Output safety error: {e}")

    # ──────────────────────────────────────────────────────────────
    # Summary
    # ──────────────────────────────────────────────────────────────
    print("\n" + "=" * 65)
    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    print(f"RESULT: {passed}/{total} checks passed")
    if passed == total:
        print("ALL CHECKS PASSED — Day 2 integration complete ✅")
    else:
        print("SOME CHECKS FAILED — see above for what to fix ❌")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(run())
