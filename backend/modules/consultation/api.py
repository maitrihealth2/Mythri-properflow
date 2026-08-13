import uuid
import asyncio
import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from core.database.models import get_db, Session as DBSession, Message, MessageEmotion, RiskLog, User, ExerciseLog, UserPersonaProfile, UserOnboarding
from providers.sarvam.sarvam_client import chat_with_maitri
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
        
        def _get_profile():
            return unified_engine.build_context(db, user_id=current_user.id)
            
        profile = await asyncio.to_thread(_get_profile)
        unified_ctx_block = profile.to_formatted_context_block()

        if is_first:
            system_prompt = f"""You are Maitri, an empathetic, warm, and highly attuned AI mental health companion.
Your tone is calm, grounded, and deeply non-judgmental.

You are generating the very FIRST welcome message to a user who just completed onboarding and opened the app.
Greet them warmly by name ({profile.preferred_name}).
Acknowledge what brought them here and their primary goal, naturally weaving it into the greeting.
Keep it brief (40-80 words max, 2-3 sentences). End with a gentle open question like "Where would you like to start today?".
IMPORTANT: Keep your internal reasoning extremely brief and output the greeting quickly."""
        else:
            system_prompt = f"""You are Maitri, an empathetic, warm, and highly attuned AI mental health companion.
Your tone is calm, grounded, and deeply non-judgmental.

You are generating the very first message to a user who just opened the app for a new session.
Greet them warmly by name ({profile.preferred_name}).
Naturally reference their recent progress or last conversation topic if available (e.g. "Last time we spoke you were working on...").
Mention just one previous topic naturally. Keep it completely natural and conversational.
Keep it brief (40-80 words max, 2-3 sentences). End with a gentle check-in like "How have things been since then?" or "What's on your mind today?".
IMPORTANT: Keep your internal reasoning extremely brief and output the greeting quickly."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"USER PROFILE:\n{unified_ctx_block}\n\n[The user has just opened the app. Please send your first welcome message.]"}
        ]
        
        initial_message = await llm_router.generate(messages, max_tokens=150, temperature=0.7)
        
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


@router.post("/message", response_model=ChatResponse)
async def send_message(
    req: ChatRequest,
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
    session = await asyncio.to_thread(_get_session)
    t_session = time.time()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # ── Telemetry ────────────────────────────────────────────────────────────
    asyncio.create_task(broadcast_event("TEXT_START", "Client Keyboard -> FastAPI", {"text": req.message}))
    CommandCenter.log_ai("TEXT_START", f"User Input: {req.message[:50]}...")

    # ── Crisis first ─────────────────────────────────────────────────────────
    crisis = check_for_crisis(req.message)
    if crisis.is_crisis:
        db.add(RiskLog(
            session_id=session.id, user_id=current_user.id,
            trigger_phrase=crisis.trigger_phrase or req.message[:200],
            system_response="AI intervened with extreme comfort.", helpline_shown=True,
        ))
        session.is_crisis_flagged = True
        db.commit()
    t_crisis = time.time()

    async def fast_telemetry():
        pass
    asyncio.create_task(fast_telemetry())

    def _get_past_messages():
        return db.query(Message).filter(
            Message.session_id == session.id
        ).order_by(Message.created_at.desc()).limit(30).all()
    past = await asyncio.to_thread(_get_past_messages)
    past.reverse()
    t_db = time.time()

    history = [{"role": "assistant" if m.role == "maitri" else m.role, "content": m.content} for m in past]
    history.append({"role": "user", "content": req.message})

    # ── Pattern Analysis ──────────────────────────────────────────────────────
    recent_user_msgs = [m.content for m in past if m.role == "user"][-5:]
    def _run_pattern_analysis():
        return analyze_patterns(recent_user_msgs, req.message)
    pattern_signal = await asyncio.to_thread(_run_pattern_analysis)
    pattern_block  = pattern_signal.as_prompt_block()
    t_pattern = time.time()

    # ── Persona Profile ───────────────────────────────────────────────────────
    persona_summary = await asyncio.to_thread(get_persona_summary, db, current_user.id)
    t_persona = time.time()

    # ── RAG ──────────────────────────────────────────────────────────────────
    def _fetch_rag():
        return retrieve_context(req.message) if RAG_AVAILABLE else ""
    rag_context = await asyncio.to_thread(_fetch_rag)
    lang_prompt = get_language_prompt(req.language)
    t_rag = time.time()

    # ── Emotion Detection ─────────────────────────────────────────────────────
    try:
        emotion = await asyncio.wait_for(detect_emotion(req.message), timeout=2.0)
    except Exception:
        emotion = detect_emotion_heuristic(req.message)
    t_emotion = time.time()

    tracker.update_emotion(session.id, emotion.label)
    tracker.record_message_length(session.id, len(req.message))
    if crisis.is_crisis:
        tracker.set_crisis_risk(session.id, "High")

    state = tracker.get_state(session.id)
    state_summary   = tracker.get_summary(session.id)
    exercise_ctx    = tracker.get_exercise_context(session.id)
    is_onboarding   = state.is_onboarding

    # ── CRSE Pipeline ────────────────────────────────────────────────────────
    memory_context = ""
    memory_usage_mode = "SILENT_BACKGROUND"
    try:
        def _run_crse_pipeline():
            from modules.memory.repository import MemoryRepository
            from modules.memory.unified_context import UnifiedCognitiveContextEngine
            from modules.memory.conversation_intent import ConversationSpeechActEngine
            from modules.memory.context_relevance import ContextRelevanceSelector

            repo = MemoryRepository(db)
            unified_engine = UnifiedCognitiveContextEngine()
            speech_engine = ConversationSpeechActEngine()
            crse = ContextRelevanceSelector()

            unified_profile = unified_engine.build_context(
                db, user_id=current_user.id, session_id=session.id, query=req.message
            )

            known_ents = set()
            if unified_profile.preferred_name:
                known_ents.add(unified_profile.preferred_name)
            for r in unified_profile.relationships:
                for word in r.split():
                    clean_word = word.strip(".,;:!?\"'")
                    if clean_word and clean_word[0].isupper() and len(clean_word) > 2:
                        known_ents.add(clean_word)

            intent_analysis = speech_engine.analyze(req.message, known_entities=list(known_ents))

            return crse.select(
                message=req.message,
                intent=intent_analysis,
                profile=unified_profile,
                known_entities=list(known_ents),
            )

        selection = await asyncio.to_thread(_run_crse_pipeline)
        memory_context = selection.to_prompt_block()
        memory_usage_mode = selection.selection_mode

    except Exception as e:
        print(f"[CRSE_PIPELINE_ERROR] {e}")
        memory_context = ""
        memory_usage_mode = "SILENT_BACKGROUND"
    t_crse = time.time()

    # ── Assessor Phase ────────────────────────────────────────────────────────
    case_file = tracker.get_case_file(session.id)

    # Release DB connection before long Assessor LLM call
    def _release_db_conn_assessor():
        db.commit()
    await asyncio.to_thread(_release_db_conn_assessor)

    if should_skip_assessor(req.message, case_file):
        msg_clean = req.message.strip().lower()
        greetings = ["hi", "hey", "hello", "yo", "sup", "good morning", "good night", "hola"]
        if any(g in msg_clean for g in greetings) and len(msg_clean.split()) <= 4:
            case_file["runtime_state"]["decision"] = "GREETING"
        else:
            case_file["runtime_state"]["decision"] = "RESPOND"
    else:
        try:
            case_file = await asyncio.wait_for(
                assess_turn(
                    messages       = history,
                    case_file      = case_file,
                    user_message   = req.message,
                    emotion_label  = emotion.label,
                    rag_context    = rag_context,
                    pattern_block  = pattern_block,
                    persona_summary= persona_summary,
                    memory_context = memory_context,
                ),
                timeout=20.0
            )
        except Exception as e:
            case_file["runtime_state"]["decision"] = "RESPOND"
        tracker.update_case_file(session.id, case_file)
    t_assessor = time.time()

    decision = case_file.get("runtime_state", {}).get("decision", "RESPOND")

    if decision == "GROUND":
        if exercise_ctx.get("state", "idle") == "idle":
            exercise_type = "GROUNDING"
            tracker.suggest_exercise(
                session.id,
                exercise_type  = exercise_type,
                triggered_by   = "assessor",
                pre_emotion    = emotion.label,
            )
            ex_log = ExerciseLog(
                session_id   = session.id,
                user_id      = current_user.id,
                exercise_type= exercise_type,
                triggered_by = "assessor",
                state        = "suggested",
                pre_emotion  = emotion.label,
            )
            db.add(ex_log)

    elif decision == "EXERCISE_CONTINUE":
        current_ex_state = exercise_ctx.get("state", "idle")
        if current_ex_state == "suggested":
            tracker.advance_exercise_state(session.id, "in_progress")

    elif decision == "EXERCISE_BREAK":
        tracker.reset_exercise(session.id)
    
    elif exercise_ctx.get("state", "idle") != "idle":
        tracker.reset_exercise(session.id)

    if exercise_ctx.get("state") == "awaiting_feedback":
        await asyncio.to_thread(
            _complete_exercise, db, session.id, current_user.id, emotion.label, req.message
        )
        tracker.reset_exercise(session.id)

    # ── Maitri Response ───────────────────────────────────────────────────────
    current_exercise_state = tracker.get_state(session.id).exercise_state

    # Release DB connection to the pool during long LLM calls
    def _release_db_conn():
        db.commit()
    await asyncio.to_thread(_release_db_conn)

    ai_response = await chat_with_maitri(
        messages       = history,
        language       = req.language,
        rag_context    = rag_context,
        case_file      = case_file,
        language_prompt= lang_prompt,
        is_crisis      = crisis.is_crisis,
        exercise_phase = current_exercise_state,
        memory_context = memory_context,
        memory_usage_mode = memory_usage_mode,
    )
    
    import re
    ai_response = re.sub(r'<scratchpad>.*?</scratchpad>', '', ai_response, flags=re.DOTALL | re.IGNORECASE).strip()
    t_maitri = time.time()

    def _save_messages():
        user_msg = Message(session_id=session.id, role="user", content=req.message, language=req.language)
        db.add(user_msg)
        db.flush()
        if emotion and emotion.label:
            db.add(MessageEmotion(message_id=user_msg.id, emotion_label=emotion.label, score=emotion.score))
        ai_msg = Message(session_id=session.id, role="assistant", content=ai_response, language=req.language)
        db.add(ai_msg)
        db.commit()
        
    await asyncio.to_thread(_save_messages)
    t_save = time.time()

    print(f"\n--- LATENCY BREAKDOWN (Session {session.id}) ---")
    print(f"Session DB: {t_session - t_start:.3f}s")
    print(f"Crisis: {t_crisis - t_session:.3f}s")
    print(f"Past Msgs: {t_db - t_crisis:.3f}s")
    print(f"Pattern: {t_pattern - t_db:.3f}s")
    print(f"Persona: {t_persona - t_pattern:.3f}s")
    print(f"RAG: {t_rag - t_persona:.3f}s")
    print(f"Emotion: {t_emotion - t_rag:.3f}s")
    print(f"CRSE: {t_crse - t_emotion:.3f}s")
    print(f"Assessor: {t_assessor - t_crse:.3f}s")
    print(f"Maitri: {t_maitri - t_assessor:.3f}s")
    print(f"Save DB: {t_save - t_maitri:.3f}s")
    print(f"TOTAL: {t_save - t_start:.3f}s\n")

    total_user_msgs = len([m for m in past if m.role == "user"]) + 1
    if total_user_msgs % 5 == 0 or total_user_msgs == 1:
        asyncio.create_task(_update_persona_async(
            db_session_id    = session.id,
            user_id          = current_user.id,
            is_first_session = is_onboarding,
        ))

    asyncio.create_task(_process_memory_write_path_async(
        user_id      = current_user.id,
        user_message = req.message,
        session_id   = session.id,
    ))

    final_ex_state = tracker.get_state(session.id)
    return ChatResponse(
        response       = ai_response,
        is_crisis      = crisis.is_crisis,
        helplines      = crisis.helplines if crisis.is_crisis else [],
        session_id     = req.session_id,
        emotion        = emotion.label,
        emotion_emoji  = emotion.emoji,
        emotion_score  = emotion.score,
        rag_used       = bool(rag_context),
        exercise_state = final_ex_state.exercise_state,
        exercise_type  = final_ex_state.active_exercise_type,
    )


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

        # Extract initial topic from first user message if onboarding
        initial_topic = user_msgs[0][:200] if is_first_session and user_msgs else None

        update_persona(
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

            # 1. Update Short-Term Working Memory Session Container
            short_term_engine.add_item(
                session_id=session_id,
                user_id=user_id,
                kind=WorkingMemoryKind.TURN_FACT,
                content=user_message[:300]
            )

            # 2. Execute Async Write Path Pipeline
            manager = MemoryManager(db_session=db)
            result = manager.process_turn(
                user_id=user_id,
                user_message=user_message,
                session_id=session_id,
            )

            # 3. Synchronize Memory Index Engine
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


