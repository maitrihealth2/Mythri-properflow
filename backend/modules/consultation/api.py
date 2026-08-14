import uuid
import asyncio
import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from core.database.models import get_db, Session as DBSession, Message, MessageEmotion, MessageAnalysis, ResponseMetadata, RiskLog, User, ExerciseLog, UserPersonaProfile, UserOnboarding
from providers.sarvam.sarvam_client import stream_chat_with_mythri
from rag.brain.emotion_detector import detect_emotion, detect_emotion_heuristic
from rag.brain.analyst import should_skip_assessor, assess_turn
from rag.brain.pattern_analyzer import analyze_patterns
from providers.sarvam.voice_client import get_language_prompt
from security.crisis_handler import check_for_crisis
from modules.profile.service import get_persona_summary, update_persona
from rag.brain.state_tracker import tracker
from security.authentication.api import get_current_user
from modules.dashboard.api import broadcast_event
from core.logger.terminal import CommandCenter

try:
    from rag.knowledge.retriever import retrieve_context, is_knowledge_base_ready
    RAG_AVAILABLE = is_knowledge_base_ready()
    if RAG_AVAILABLE:
        print("[RAG] Knowledge base loaded")
    else:
        print("[RAG] Not ready — run: python -m modules.knowledge.loader")
except Exception as e:
    print(f"[RAG] Not available: {e}")
    RAG_AVAILABLE = False
    def retrieve_context(query, n_results=3): return ""

router = APIRouter(prefix="/api/consultation", tags=["consultation"])


class StartSessionResponse(BaseModel):
    session_id: str
    message: str
    is_first_session: bool = False


class ChatRequest(BaseModel):
    session_id: str
    message: str
    language: str = "en-IN"


class ChatResponse(BaseModel):
    response: str
    is_crisis: bool
    helplines: list[str]
    session_id: str
    emotion: str
    emotion_emoji: str
    emotion_score: float
    rag_used: bool
    exercise_state: str = "idle"
    exercise_type: str | None = None




@router.post("/start", response_model=StartSessionResponse)
async def start_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    def _create_session():
        token = str(uuid.uuid4())
        new_session = DBSession(user_id=current_user.id, session_token=token, channel="web")
        db.add(new_session); db.commit(); db.refresh(new_session)
        session_count = db.query(DBSession).filter(DBSession.user_id == current_user.id).count()
        return new_session.id, token, session_count == 1

    session_id, token, is_first = await asyncio.to_thread(_create_session)

    # Initialize state tracker for this session
    tracker.init_session(session_id, is_first_session=is_first)

    # ── Generate Dynamic Personalized Opening Message ────────────────────────
    try:
        from modules.memory.unified_context import UnifiedCognitiveContextEngine
        from providers.llm.router import llm_router
        
        unified_engine = UnifiedCognitiveContextEngine()
        
        from core.database.models import SessionSummary
        
        async def _get_profile():
            print('[DEBUG] Building context...', flush=True)
            prof_task = unified_engine.build_context_async(user_id=current_user.id, user_language=current_user.preferred_language)
            
            def _get_summary():
                from core.database.models import SessionLocal
                with SessionLocal() as ldb:
                    return ldb.query(SessionSummary).filter(SessionSummary.user_id == current_user.id).order_by(SessionSummary.created_at.desc()).first()
            
            print('[DEBUG] Getting summary...', flush=True)
            summary_task = asyncio.to_thread(_get_summary)
            prof, last_summary = await asyncio.gather(prof_task, summary_task)
            print('[DEBUG] Done getting profile.', flush=True)
            return prof, last_summary
            
        profile, last_summary = await _get_profile()
        print('[DEBUG] Got profile.', flush=True)
        unified_ctx_block = profile.to_formatted_context_block(is_greeting=True)
        summary_block = f"\n[LAST SESSION SUMMARY]\nMain Topics: {last_summary.main_topics}\nEmotional Progression: {last_summary.emotional_progression}\nUnresolved: {last_summary.unresolved_topics}\n" if last_summary else ""

        if is_first:
            system_prompt = f"""You are Mythri, a warm, conversational, and highly attuned friend.
Your tone is calm, grounded, and deeply non-judgmental.

You are generating the very FIRST welcome message to a user who just completed onboarding and opened the app.
Greet them warmly by name ({profile.preferred_name}).
Acknowledge what brought them here naturally, but DO NOT sound like a clinical intake form or a database dump. 
Make them feel: "I don't have to perform here, I can talk normally."
Keep it brief (40-80 words max, 2-3 sentences). End with a gentle open question like "Where would you like to start today?" or just a warm statement like "I'm here whenever you're ready."
IMPORTANT: Keep your internal reasoning extremely brief and output the greeting quickly."""
        else:
            system_prompt = f"""You are Mythri, a warm, conversational, and highly attuned friend.
Your tone is calm, grounded, and deeply non-judgmental.

You are generating the very first message to a user who just opened the app for a new session.
Greet them warmly by name ({profile.preferred_name}).
Naturally reference their recent progress or last conversation topic if available, but DO NOT sound like a robotic summary.
Keep it completely natural and conversational.
Keep it brief (40-80 words max, 2-3 sentences). You DO NOT have to ask a question. A warm statement like "It's good to see you again" is perfectly fine. Let them lead.
IMPORTANT: Keep your internal reasoning extremely brief and output the greeting quickly."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"USER PROFILE:\n{unified_ctx_block}{summary_block}\n\n[The user has just opened the app. Please send your first welcome message.]"}
        ]
        
        print('[DEBUG] Calling LLM generate...', flush=True)
        initial_message = await llm_router.generate(messages, max_tokens=150, temperature=0.7)
        print('[DEBUG] Got LLM response.', flush=True)
        
        if not initial_message or not initial_message.strip():
            raise Exception("LLM router returned an empty response")
            
        def _save_message():
            ai_msg = Message(session_id=session_id, role="assistant", content=initial_message)
            db.add(ai_msg)
            db.commit()

            
        await asyncio.to_thread(_save_message)

    except Exception as e:
        print(f"[PERSONALIZED_GREETING_ERROR] {e}")
        initial_message = f"Welcome back, {current_user.username}. This is your quiet space. What would you like to talk about today?"
        
        def _save_fallback():
            ai_msg = Message(session_id=session_id, role="assistant", content=initial_message)
            db.add(ai_msg)
            db.commit()
            
        await asyncio.to_thread(_save_fallback)

    return StartSessionResponse(
        session_id=token,
        message=initial_message,
        is_first_session=is_first,
    )


@router.post("/message")
async def send_message(
    req: ChatRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import time
    t_start = time.time()
    
    def _get_session():
        return db.query(DBSession).filter(
            DBSession.session_token == req.session_id,
            DBSession.user_id == current_user.id,
        ).first()
    session = _get_session()
    t_session = time.time()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    asyncio.create_task(broadcast_event("TEXT_START", "Client Keyboard -> FastAPI", {"text": req.message}))
    CommandCenter.log_ai("TEXT_START", f"User Input: {req.message[:50]}...")

    crisis = check_for_crisis(req.message)
    if crisis.is_crisis:
        db.add(RiskLog(
            session_id=session.id, user_id=current_user.id,
            trigger_phrase=crisis.trigger_phrase or req.message[:200],
            system_response="AI intervened with extreme comfort.", helpline_shown=True,
        ))
        session.is_crisis_flagged = True
        db.commit()

    from security.safety_validator import evaluate_input_safety
    background_tasks.add_task(evaluate_input_safety, req.message)

    def _get_past_messages():
        from core.database.models import SessionLocal
        with SessionLocal() as local_db:
            past_msgs = local_db.query(Message).filter(
                Message.session_id == session.id
            ).order_by(Message.created_at.desc()).limit(30).all()
            past_msgs.reverse()
            # Map to dicts inside the session to prevent DetachedInstanceError
            return [{"role": "assistant" if m.role == "mythri" else m.role, "content": m.content} for m in past_msgs]

    def _fetch_rag():
        return retrieve_context(req.message) if RAG_AVAILABLE else ""

    def _get_emotion_sync():
        t_s = time.time()
        try:
            loop = asyncio.new_event_loop()
            emo = loop.run_until_complete(detect_emotion(req.message))
            loop.close()
            return emo, time.time() - t_s
        except Exception:
            return detect_emotion_heuristic(req.message), time.time() - t_s

    async def _run_crse_pipeline():
        from modules.memory.repository import MemoryRepository
        from modules.memory.unified_context import UnifiedCognitiveContextEngine
        from modules.memory.conversation_intent import ConversationSpeechActEngine
        from modules.memory.context_relevance import ContextRelevanceSelector

        unified_engine = UnifiedCognitiveContextEngine()
        speech_engine = ConversationSpeechActEngine()
        crse = ContextRelevanceSelector()

        unified_profile = await unified_engine.build_context_async(
            user_id=current_user.id, session_id=session.id, query=req.message,
            user_language=current_user.preferred_language
        )
        known_ents = set()
        if unified_profile.preferred_name: known_ents.add(unified_profile.preferred_name)
        for r in unified_profile.relationships:
            for word in r.split():
                clean_word = word.strip(".,;:!\"'")
                if clean_word and clean_word[0].isupper() and len(clean_word) > 2:
                    known_ents.add(clean_word)

        intent_analysis = speech_engine.analyze(req.message, known_entities=list(known_ents))
        selection = crse.select(
            message=req.message,
            intent=intent_analysis,
            profile=unified_profile,
            known_entities=list(known_ents),
        )
        return selection, unified_profile

    t_context_start = time.time()

    def _get_persona_sync():
        from core.database.models import SessionLocal
        with SessionLocal() as local_db:
            return get_persona_summary(local_db, current_user.id)

    net_results = await asyncio.gather(
        asyncio.to_thread(_fetch_rag),
        asyncio.to_thread(_get_emotion_sync),
        asyncio.to_thread(_get_past_messages),
        _run_crse_pipeline(),
        asyncio.to_thread(_get_persona_sync),
        return_exceptions=True
    )
    
    rag_context = net_results[0] if not isinstance(net_results[0], Exception) else ""
    emotion_res = net_results[1] if not isinstance(net_results[1], Exception) else (detect_emotion_heuristic(req.message), 0.0)
    emotion, emotion_latency = emotion_res
    past = net_results[2] if not isinstance(net_results[2], Exception) else []
    crse_res = net_results[3] if not isinstance(net_results[3], Exception) else (None, None)
    selection, unified_profile = crse_res
    persona_summary = net_results[4] if not isinstance(net_results[4], Exception) else ""
    
    t_context = time.time()

    memory_context = selection.to_prompt_block() if selection else ""
    memory_usage_mode = selection.selection_mode if selection else "SILENT_BACKGROUND"

    history = past.copy() if past else []
    history.append({"role": "user", "content": req.message})

    # analyze_patterns is moved to background

    tracker.update_emotion(session.id, emotion.label)
    tracker.record_message_length(session.id, len(req.message))
    if crisis.is_crisis: tracker.set_crisis_risk(session.id, "High")

    state = tracker.get_state(session.id)
    state_summary = tracker.get_summary(session.id)
    exercise_ctx = tracker.get_exercise_context(session.id)
    is_onboarding = state.is_onboarding
    lang_prompt = get_language_prompt(req.language)

    case_file = tracker.get_case_file(session.id)
    if should_skip_assessor(req.message, case_file):
        msg_clean = req.message.strip().lower()
        greetings = ["hi", "hey", "hello", "yo", "sup", "good morning", "good night", "hola"]
        if "runtime_state" not in case_file: case_file["runtime_state"] = {}
        if any(g in msg_clean for g in greetings) and len(msg_clean.split()) <= 4:
            case_file["runtime_state"]["response_strategy"] = "GREETING"
        else:
            case_file["runtime_state"]["response_strategy"] = "LISTEN"
    
    # assess_turn is moved to background to prevent blocking First Token

    t_assessor = time.time()
    strategy = case_file.get("runtime_state", {}).get("response_strategy", "LISTEN")
    decision = case_file.get("runtime_state", {}).get("exercise_decision", "NONE")

    if strategy == "GROUND" and exercise_ctx.get("state", "idle") == "idle":
        exercise_type = "GROUNDING"
        tracker.suggest_exercise(session.id, exercise_type=exercise_type, triggered_by="assessor", pre_emotion=emotion.label)
        db.add(ExerciseLog(session_id=session.id, user_id=current_user.id, exercise_type=exercise_type, triggered_by="assessor", state="suggested", pre_emotion=emotion.label))
    elif decision == "EXERCISE_CONTINUE" and exercise_ctx.get("state", "idle") == "idle":
        tracker.advance_exercise_state(session.id, "in_progress")
    elif decision == "EXERCISE_BREAK" or exercise_ctx.get("state", "idle") != "idle":
        tracker.reset_exercise(session.id)

    if exercise_ctx.get("state") == "awaiting_feedback":
        _complete_exercise(db, session.id, current_user.id, emotion.label, req.message)
        tracker.reset_exercise(session.id)

    current_exercise_state = tracker.get_state(session.id).exercise_state
    db.commit()

    async def post_process_message(final_text: str):
        from core.database.models import SessionLocal
        bg_db = SessionLocal()
        try:
            user_msg = Message(session_id=session.id, role="user", content=req.message, language=req.language)
            bg_db.add(user_msg)
            bg_db.flush()
            
            if emotion and emotion.label:
                bg_db.add(MessageEmotion(message_id=user_msg.id, emotion_label=emotion.label, score=emotion.score))
                
            bg_db.add(MessageAnalysis(
                message_id=user_msg.id,
                session_id=session.id,
                speaker="user",
                emotion=emotion.label if emotion else "neutral",
                emotion_intensity=emotion.score if emotion else 0.0,
                cognitive_signals=case_file.get("cognitive_patterns", []),
                conversation_intent=case_file.get("conversation_state", {}).get("engagement", 0.5),
                risk_level=case_file.get("conversation_state", {}).get("risk_level", "low")
            ))
                
            ai_msg = Message(session_id=session.id, role="assistant", content=final_text, language=req.language)
            bg_db.add(ai_msg)
            bg_db.flush()
            
            runtime_state = case_file.get("runtime_state", {})
            bg_db.add(ResponseMetadata(
                message_id=ai_msg.id,
                response_strategy=runtime_state.get("response_strategy", "LISTEN"),
                reason_codes=runtime_state.get("reason_codes", []),
                expected_effect=runtime_state.get("expected_effect", ""),
                context_used=case_file
            ))
            bg_db.commit()
            
            # Background Background Assessor and Pattern Analysis
            try:
                bg_history = history.copy()
                bg_history.append({"role": "assistant", "content": final_text})
                
                recent_user_msgs = [m.get("content") for m in past if m.get("role") == "user"][-5:]
                bg_pattern_signal = await asyncio.to_thread(analyze_patterns, recent_user_msgs, req.message)
                bg_pattern_block = bg_pattern_signal.as_prompt_block()
                
                bg_case_file = await asyncio.wait_for(
                    assess_turn(
                        messages       = bg_history,
                        case_file      = case_file,
                        user_message   = req.message,
                        emotion_label  = emotion.label,
                        rag_context    = rag_context,
                        pattern_block  = bg_pattern_block,
                        persona_summary= persona_summary,
                        memory_context = memory_context,
                    ),
                    timeout=10.0
                )
                tracker.update_case_file(session.id, bg_case_file)
            except Exception as e:
                print(f"[Background Assessor] Error: {e}")
                
            from rag.brain.evaluator import evaluate_response_async
            await evaluate_response_async(ai_msg.id)
            
            total_user_msgs = len([m for m in past if m.get("role") == "user"]) + 1
            if total_user_msgs % 5 == 0 or total_user_msgs == 1:
                await _update_persona_async(session.id, current_user.id, is_onboarding)
                
            await _process_memory_write_path_async(current_user.id, req.message, session.id)
        except Exception as e:
            print(f"[PostProcess] Error: {e}")
            bg_db.rollback()
        finally:
            bg_db.close()

    t_prompt = time.time()
    
    print(f"\n[PERF]")
    print(f"AUTH/SESSION={t_session - t_start:.3f}s")
    print(f"SAFETY={t_context_start - t_session:.3f}s")
    print(f"CONTEXT_GATHER={t_context - t_context_start:.3f}s")
    print(f"PROMPT_BUILD={t_prompt - t_assessor:.3f}s")
    print(f"TOTAL_PRE_STREAM={t_prompt - t_start:.3f}s\n")

    async def response_generator():
        import json
        
        init_metadata = {
            "type": "initial_metadata",
            "is_crisis": crisis.is_crisis,
            "helplines": crisis.helplines if crisis.is_crisis else [],
            "emotion": emotion.label if emotion else "neutral",
            "emotion_emoji": emotion.emoji if emotion else "",
            "exercise_state": current_exercise_state,
            "exercise_type": tracker.get_state(session.id).active_exercise_type,
            "rag_used": bool(rag_context)
        }
        yield json.dumps(init_metadata) + "\n"

        full_text = ""
        first_token = True
        try:
            async for chunk_raw in stream_chat_with_mythri(
                messages       = history,
                language       = req.language,
                rag_context    = rag_context,
                case_file      = case_file,
                language_prompt= lang_prompt,
                is_crisis      = crisis.is_crisis,
                exercise_phase = current_exercise_state,
                memory_context = memory_context,
                memory_usage_mode = memory_usage_mode,
            ):
                if first_token:
                    t_first_token = time.time()
                    llm_ttft = t_first_token - t_prompt
                    b_ctx_ms = unified_profile.assembly_duration_ms if unified_profile else 0
                    db_acq_ms = unified_profile.db_acquire_ms if unified_profile else 0
                    query_ms = unified_profile.query_total_ms if unified_profile else 0
                    
                    print(f"\n[PHASE3 PERF]")
                    print(f"DB_ACQUIRE={db_acq_ms/1000:.3f}s")
                    print(f"QUERY_TOTAL={query_ms/1000:.3f}s")
                    print(f"BUILD_CONTEXT={b_ctx_ms/1000:.3f}s")
                    print(f"CONTEXT_GATHER={t_context - t_context_start:.3f}s")
                    print(f"AUTH={t_session - t_start:.3f}s")
                    print(f"SESSION=0.000s")
                    print(f"PROMPT_BUILD={t_prompt - t_assessor:.3f}s")
                    print(f"LLM_TTFT={llm_ttft:.3f}s")
                    print(f"TOTAL={t_first_token - t_start:.3f}s\n")
                    first_token = False
                if not chunk_raw: continue
                yield chunk_raw
                try:
                    obj = json.loads(chunk_raw.strip())
                    if obj.get("type") == "metadata" and obj.get("full_text"):
                        full_text = obj.get("full_text")
                except Exception:
                    pass
        except Exception as e:
            print(f"[LLM STREAM ERROR] {e}")
            fallback_text = "I'm having a little trouble connecting right now, but please know I'm here for you. Let's take a deep breath together. Could you try sending your message again?"
            yield json.dumps({"type": "chunk", "text": fallback_text}) + "\n"
            full_text = fallback_text
        finally:
            if full_text:
                background_tasks.add_task(post_process_message, full_text)

    return StreamingResponse(response_generator(), media_type="application/x-ndjson")

def _complete_exercise(db: Session, session_id: int, user_id: int, post_emotion: str, feedback_text: str):
    """Mark the most recent in-progress ExerciseLog as completed."""
    ex_log = db.query(ExerciseLog).filter(
        ExerciseLog.session_id == session_id,
        ExerciseLog.user_id   == user_id,
        ExerciseLog.state.in_(["suggested", "in_progress", "awaiting_feedback"]),
    ).order_by(ExerciseLog.started_at.desc()).first()

    if ex_log:
        ex_log.state        = "completed"
        ex_log.post_emotion = post_emotion
        ex_log.user_feedback= feedback_text[:500]
        ex_log.completed_at = datetime.utcnow()
        db.commit()


async def _update_persona_async(db_session_id: int, user_id: int, is_first_session: bool):
    """Non-blocking persona update — runs in background after response is sent."""
    from core.database.models import SessionLocal
    db = SessionLocal()
    try:
        state = tracker.get_state(db_session_id)
        past = db.query(Message).filter(
            Message.session_id == db_session_id,
            Message.role == "user",
        ).order_by(Message.created_at).all()
        user_msgs = [m.content for m in past]

        initial_topic = user_msgs[0][:200] if is_first_session and user_msgs else None

        await asyncio.to_thread(
            update_persona,
            db                      = db,
            user_id                 = user_id,
            session_message_lengths = state.session_message_lengths,
            session_emotions        = state.session_emotions_seen,
            user_messages           = user_msgs,
            is_first_session        = is_first_session,
            initial_topic           = initial_topic,
        )
    except Exception as e:
        print(f"[PersonaUpdate] Background update failed: {e}")
    finally:
        db.close()


async def _process_memory_write_path_async(user_id: int, user_message: str, session_id: int) -> None:
    """
    Milestone 11 Write-Path Integration Worker.
    Executes MemoryManager asynchronously after client response generation.
    Completely isolated so background errors never impact user turn responses.
    """
    from core.database.models import SessionLocal
    from modules.memory import MemoryManager

    def _run_task():
        db = SessionLocal()
        try:
            from modules.memory import MemoryManager, short_term_engine, index_engine, WorkingMemoryKind

            short_term_engine.add_item(
                session_id=session_id,
                user_id=user_id,
                kind=WorkingMemoryKind.TURN_FACT,
                content=user_message[:300]
            )

            manager = MemoryManager(db_session=db)
            result = manager.process_turn(
                user_id=user_id,
                user_message=user_message,
                session_id=session_id,
            )

            for dec in result.decisions:
                if dec.is_actionable and dec.candidate:
                    index_engine.on_memory_created(dec.candidate)

            if result.has_actionable_decisions:
                CommandCenter.log_ai("MEMORY_WRITE", f"Extracted {len(result.candidates)} candidates, executed {len(result.decisions)} decisions for user {user_id}")
        except Exception as err:
            CommandCenter.log_ai("MEMORY_ERROR", f"Memory background processing failed: {err}")
        finally:
            db.close()

    try:
        await asyncio.to_thread(_run_task)
    except Exception as exc:
        CommandCenter.log_ai("MEMORY_FAILURE", f"Isolated memory task execution error: {exc}")

@router.get("/history")
def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = db.query(DBSession).filter(
        DBSession.user_id == current_user.id
    ).order_by(DBSession.started_at.desc()).all()
    return [{"session_id": s.session_token, "started_at": s.started_at,
             "ended_at": s.ended_at, "is_crisis_flagged": s.is_crisis_flagged,
             "channel": s.channel} for s in sessions]


@router.get("/dashboard_stats/overview")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from sqlalchemy import func
    from core.database.models import UserJournal

    total_sessions  = db.query(func.count(DBSession.id)).filter(DBSession.user_id == current_user.id).scalar() or 0
    journal_entries = db.query(func.count(UserJournal.id)).filter(UserJournal.user_id == current_user.id).scalar() or 0
    mindful_minutes = (total_sessions * 15) + (journal_entries * 5)

    latest_emotion = db.query(MessageEmotion).join(MessageEmotion.message).join(Message.session).filter(
        DBSession.user_id == current_user.id,
        Message.role == "user"
    ).order_by(MessageEmotion.created_at.desc()).first()

    current_mood = latest_emotion.emotion_label.capitalize() if latest_emotion else "Calm"
    mood_emojis  = {
        "Joy": "😊", "Calm": "😌", "Sadness": "😔", "Anger": "😠", "Fear": "😨",
        "Disgust": "🤢", "Surprise": "😲", "Neutral": "😐"
    }
    mood_emoji = mood_emojis.get(current_mood, "😌")

    return {
        "total_sessions":     total_sessions,
        "journal_entries":    journal_entries,
        "mindful_minutes":    mindful_minutes,
        "current_mood":       current_mood,
        "current_mood_emoji": mood_emoji,
        "wellness_streak":    min(total_sessions + journal_entries, 12),
        "today_reflection": {
            "quote":  "You do not have to be a fire for every mountain blocking you. You could be a water and soft river your way to freedom too.",
            "author": "Nayyirah Waheed",
            "prompt": "Where can you allow yourself to be softer today?",
        },
    }


@router.get("/{session_id}")
def get_transcript(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from sqlalchemy.orm import joinedload
    session = db.query(DBSession).options(
        joinedload(DBSession.messages).joinedload(Message.emotion)
    ).filter(
        DBSession.session_token == session_id,
        DBSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id":       session_id,
        "started_at":       session.started_at,
        "is_crisis_flagged":session.is_crisis_flagged,
        "messages": [{
            "role":          m.role,
            "content":       m.content,
            "created_at":    m.created_at,
            "language":      m.language,
            "emotion":       m.emotion.emotion_label if m.emotion else None,
            "emotion_score": m.emotion.score if m.emotion else None,
        } for m in session.messages],
    }


async def generate_session_summary(session_id: int, user_id: int):
    # run in background
    from core.database.models import SessionLocal
    db = SessionLocal()
    try:
        from core.database.models import SessionSummary
        summary = SessionSummary(
            session_id=session_id,
            user_id=user_id,
            main_topics=["General Check-in"],
            emotional_progression=["Neutral"],
            important_context="Auto-generated end of session.",
            unresolved_topics=[]
        )
        db.add(summary)
        db.commit()
    except Exception as e:
        print(f"Error generating session summary: {e}")
    finally:
        db.close()


@router.post("/{session_id}/end")
def end_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(DBSession).filter(
        DBSession.session_token == session_id,
        DBSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.session_status = "completed"
    session.ended_at = datetime.utcnow()
    db.commit()
    
    # Trigger the async summarizer task
    asyncio.create_task(generate_session_summary(session.id, current_user.id))
    
    return {"status": "ended", "session_id": session_id}


@router.get("/{session_id}/analysis")
def get_session_analysis(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from sqlalchemy.orm import joinedload
    session = db.query(DBSession).options(
        joinedload(DBSession.messages).joinedload(Message.analysis),
        joinedload(DBSession.messages).joinedload(Message.response_metadata)
    ).filter(
        DBSession.session_token == session_id,
        DBSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    messages_data = []
    for m in session.messages:
        data = {
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        if m.role == "user" and m.analysis:
            data["analysis"] = {
                "emotion": m.analysis.emotion,
                "cognitive_signals": m.analysis.cognitive_signals,
                "risk_level": m.analysis.risk_level
            }
        if m.role == "assistant" and m.response_metadata:
            data["metadata"] = {
                "response_strategy": m.response_metadata.response_strategy,
                "reason_codes": m.response_metadata.reason_codes,
                "expected_effect": m.response_metadata.expected_effect,
                "improvement_targets": m.response_metadata.improvement_targets,
                "quality_score": m.response_metadata.quality_score
            }
        messages_data.append(data)
        
    return {
        "session_id": session_id,
        "cognitive_summary": session.cognitive_summary,
        "messages": messages_data
    }

