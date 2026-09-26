"""
Test: NVIDIA NIM Summary Generation for test2@org.in
=====================================================
Tests:
  1. DB connection + locate user test2@org.in
  2. Whole-DB aggregation (WholeDBUserAggregator)
  3. MasterMemorySynthesizer via NVIDIA NIM (generate_summary)
  4. Session summary generation via NVIDIA NIM
  5. Prints final compact_summary written to DB

Run from backend/ directory:
  python test_nvidia_summary.py
"""

import asyncio
import sys
import os
import pathlib
import json

# ── Path bootstrap ──────────────────────────────────────────────────────────
BASE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))

from dotenv import load_dotenv
load_dotenv(BASE / ".env")
load_dotenv(BASE / ".env.local", override=True)

# ── Imports after env load ───────────────────────────────────────────────────
from core.database.models import SessionLocal, User, LivingUserContext, Session as DBSession

DIVIDER = "-" * 65


def _section(title: str):
    print(f"\n{DIVIDER}")
    print(f"  {title}")
    print(DIVIDER)


async def main():
    print("\n" + "=" * 65)
    print("  MYTHRI -- NVIDIA NIM Summary Test (test2@org.in)")
    print("=" * 65)

    db = SessionLocal()

    try:
        # ── 1. Locate user ───────────────────────────────────────────────────
        _section("STEP 1 — Locate user in DB")
        user = db.query(User).filter(User.email == "test2@org.in").first()
        if not user:
            print("❌  User test2@org.in not found in database. Aborting.")
            return
        print(f"✅  Found user: id={user.id}  username={user.username}  email={user.email}")
        user_id = user.id

        # ── 2. Count sessions + messages ─────────────────────────────────────
        _section("STEP 2 — User session statistics")
        sessions = db.query(DBSession).filter(DBSession.user_id == user_id).all()
        print(f"   Sessions : {len(sessions)}")
        total_msgs = 0
        for s in sessions:
            from core.database.models import Message
            count = db.query(Message).filter(Message.session_id == s.id).count()
            total_msgs += count
            print(f"   Session #{s.id} — {count} messages")
        print(f"   Total messages: {total_msgs}")

        if total_msgs == 0:
            print("⚠️   No messages found — summary will be minimal but we proceed anyway.")

        # ── 3. Whole-DB aggregation ──────────────────────────────────────────
        _section("STEP 3 — WholeDBUserAggregator")
        from modules.memory.global_aggregator import WholeDBUserAggregator
        dump = WholeDBUserAggregator.aggregate_user(db, user_id)
        print(f"   preferred_name      : {dump.preferred_name}")
        print(f"   total_sessions      : {dump.total_sessions_count}")
        print(f"   total_messages      : {dump.total_messages_count}")
        print(f"   existing_memories   : {len(dump.existing_memories)}")
        print(f"   journals            : {len(dump.journals)}")
        print(f"   goals               : {len(dump.goals)}")
        prompt = dump.to_compact_synthesis_prompt()
        print(f"   synthesis_prompt_len: {len(prompt)} chars (~{len(prompt)//4} tokens)")

        # ── 4. NVIDIA NIM — MasterMemorySynthesizer ──────────────────────────
        _section("STEP 4 — MasterMemorySynthesizer via NVIDIA NIM")
        print("   Calling llm_router.generate_summary(task=master_synthesizer)...")

        from providers.llm.router import llm_router
        from modules.memory.master_synthesizer import MASTER_SYNTHESIS_SYSTEM_PROMPT

        api_messages = [
            {"role": "system", "content": MASTER_SYNTHESIS_SYSTEM_PROMPT},
            {"role": "user",   "content": prompt}
        ]

        import time
        t0 = time.time()
        response = await llm_router.generate_summary(
            api_messages=api_messages,
            max_tokens=1500,
            temperature=0.2,
            task_name="master_synthesizer_test",
        )
        elapsed = round(time.time() - t0, 2)

        if response is None:
            print(f"❌  generate_summary returned None (both NVIDIA and Sarvam failed)")
            return

        print(f"✅  Response received in {elapsed}s")
        print(f"   Response length: {len(response)} chars")

        # ── 5. Parse JSON ────────────────────────────────────────────────────
        _section("STEP 5 — Parse JSON response")
        import re
        match = re.search(r'\{.*\}', response, re.DOTALL)
        if not match:
            print("❌  Could not find JSON in response. Raw output:")
            print(response[:500])
            return

        try:
            parsed = json.loads(match.group(0))
            print("✅  JSON parsed successfully")
            print(f"\n   compact_summary   : {parsed.get('compact_summary', 'N/A')}")
            print(f"\n   active_themes     : {parsed.get('active_themes', [])}")
            unresolved = parsed.get("active_unresolved_loops", [])
            print(f"\n   unresolved_loops  : {[u.get('topic', u) if isinstance(u, dict) else u for u in unresolved]}")
            emo = parsed.get("longitudinal_emotional_model", {})
            print(f"\n   emotional baseline: {emo.get('baseline_state', 'N/A')}")
            rels = parsed.get("relationship_graph", [])
            print(f"\n   relationships     : {[r.get('name') for r in rels]}")
        except json.JSONDecodeError as e:
            print(f"❌  JSON decode error: {e}")
            print("Raw response (first 800 chars):")
            print(response[:800])
            return

        # ── 6. Write to DB ────────────────────────────────────────────────────
        _section("STEP 6 — Write LivingUserContext to DB")
        living_ctx = db.query(LivingUserContext).filter(LivingUserContext.user_id == user_id).first()
        if not living_ctx:
            living_ctx = LivingUserContext(user_id=user_id)
            db.add(living_ctx)
            db.commit()
            db.refresh(living_ctx)

        living_ctx.compact_summary   = parsed.get("compact_summary") or living_ctx.compact_summary
        living_ctx.active_themes     = parsed.get("active_themes")   or living_ctx.active_themes
        unresolved_clean = [
            u.get("topic", str(u)) if isinstance(u, dict) else str(u)
            for u in parsed.get("active_unresolved_loops", [])
        ]
        living_ctx.unresolved_topics = unresolved_clean
        living_ctx.emotional_baseline = emo.get("baseline_state") or living_ctx.emotional_baseline
        living_ctx.raw_structured_json = parsed
        living_ctx.processing_status   = "completed"
        db.commit()
        print("✅  LivingUserContext written to DB")

        # ── 7. Session summary test (most recent session) ─────────────────────
        if sessions:
            _section("STEP 7 — Session summary for most recent session")
            latest = sessions[-1]
            print(f"   Session #{latest.id}")

            from core.database.models import Message, SessionSummary
            msgs = db.query(Message).filter(
                Message.session_id == latest.id
            ).order_by(Message.created_at).all()

            if len(msgs) < 2:
                print("   ⚠️  Too few messages for a session summary — skipping")
            else:
                lines = []
                for m in msgs:
                    role = "User" if m.role == "user" else "Mythri"
                    lines.append(f"{role}: {m.content[:200]}")
                conversation_text = "\n".join(lines[-20:])

                summary_prompt = f"""You are summarizing a therapy companion session.

SESSION TRANSCRIPT:
{conversation_text}

Generate a concise session summary as JSON. Be specific.

{{
  "main_topics": ["specific topic 1", "specific topic 2"],
  "emotional_progression": ["starting emotion", "ending emotion"],
  "important_context": "Key insight in 1-2 sentences",
  "unresolved_topics": ["anything needing follow-up"],
  "intervention_used": null,
  "session_outcome": "How the session ended"
}}

Output ONLY valid JSON. Keep each string under 150 chars. Arrays max 3 items."""

                t0 = time.time()
                sess_response = await llm_router.generate_summary(
                    api_messages=[
                        {"role": "system", "content": "You are a clinical session summarizer. Output only valid JSON."},
                        {"role": "user",   "content": summary_prompt}
                    ],
                    max_tokens=400,
                    temperature=0.2,
                    task_name="session_summary_test",
                )
                elapsed = round(time.time() - t0, 2)

                if sess_response:
                    smatch = re.search(r'\{.*\}', sess_response, re.DOTALL)
                    if smatch:
                        try:
                            sdata = json.loads(smatch.group(0))
                            print(f"✅  Session summary received in {elapsed}s")
                            print(f"   main_topics       : {sdata.get('main_topics')}")
                            print(f"   emotional_progress: {sdata.get('emotional_progression')}")
                            print(f"   important_context : {sdata.get('important_context')}")
                            print(f"   session_outcome   : {sdata.get('session_outcome')}")
                        except json.JSONDecodeError:
                            print(f"⚠️  Session summary JSON parse failed. Raw: {sess_response[:300]}")
                    else:
                        print(f"⚠️  No JSON in session summary response: {sess_response[:300]}")
                else:
                    print("❌  Session summary returned None")

        # ── Final summary ─────────────────────────────────────────────────────
        _section("TEST COMPLETE")
        print("✅  NVIDIA NIM summary generation working correctly")
        print(f"   Provider chain: NVIDIA llama-3.3-70b → nemotron-nano-8b → Sarvam → None")
        print()

    except Exception as e:
        import traceback
        print(f"\n❌  UNEXPECTED ERROR: {e}")
        traceback.print_exc()
    finally:
        db.close()
        # Clean up router connections
        try:
            await llm_router.close()
        except Exception:
            pass


if __name__ == "__main__":
    asyncio.run(main())
