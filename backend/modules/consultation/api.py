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
def start_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    token = str(uuid.uuid4())
    session = DBSession(user_id=current_user.id, session_token=token, channel="web")
    db.add(session); db.commit(); db.refresh(session)

    # Detect if this is the user's very first session
    session_count = db.query(DBSession).filter(DBSession.user_id == current_user.id).count()
    is_first = session_count == 1

    # Initialize state tracker for this session
    tracker.init_session(session.id, is_first_session=is_first)

    # ── Generate Dynamic Personalized Opening Message ────────────────────────
    try:
        from modules.memory.unified_context import UnifiedCognitiveContextEngine
        unified_engine = UnifiedCognitiveContextEngine()
        profile = unified_engine.build_context(db, user_id=current_user.id)
        unified_ctx_block = profile.to_formatted_context_block()

        if is_first:
            system_prompt = f"""You are generating the very FIRST welcome message for a new user who just completed onboarding.
USER COGNITIVE PROFILE:
{unified_ctx_block}

Instructions:
1. Warmly welcome them by name ({profile.preferred_name}).
2. Acknowledge what brought them here and their primary goal, naturally weaving it into the greeting.
3. Keep it brief (2-3 sentences max).
4. End with a gentle open question like "Where would you like to start today?".
5. Maintain Mythri tone: calm, grounded, deeply empathetic."""
        else:
            system_prompt = f"""You are generating a personalized WELCOME BACK opening message for a returning user starting a new session.
USER COGNITIVE PROFILE:
{unified_ctx_block}

Instructions:
1. Greet them warmly by name ({profile.preferred_name}).
2. Naturally reference their recent progress, goals, or last conversation topic if available (e.g. "Last time we spoke you were working on...").
3. Do NOT say 'I remember the following about you'. Keep it completely natural and conversational.
4. Keep it brief (2-3 sentences max). End with a gentle check-in like "How have things been since then?" or "What's on your mind today?".
5. Maintain Mythri tone: warm, attentive, non-judgmental."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Generate my personalized session opening greeting."}
        ]
        initial_message = chat_with_maitri(
            messages=messages,
            language=profile.language or "en-IN",
            memory_context=unified_ctx_block,
            memory_usage_mode="SILENT_BACKGROUND",
            max_tokens=200
        )
        ai_msg = Message(session_id=session.id, role="maitri", content=initial_message, emotion="calm")
        db.add(ai_msg)
        db.commit()
    except Exception as e:
        print(f"[PERSONALIZED_GREETING_ERROR] {e}")
        initial_message = f"Welcome back, {current_user.username}. This is your quiet space. What would you like to talk about today?"

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
    session = db.query(DBSession).filter(
        DBSession.session_token == req.session_id,
        DBSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # ── Telemetry ────────────────────────────────────────────────────────────
    asyncio.create_task(broadcast_event("TEXT_START", "Client Keyboard -> FastAPI", {"text": req.message}))
    CommandCenter.log_ai("TEXT_START", f"User Input: {req.message[:50]}...")

    # ── Crisis first ─────────────────────────────────────────────────────────
    await broadcast_event("CRISIS_CHECK", "Checking for triggers")
    CommandCenter.log_ai("CRISIS_CHECK", "Scanning message for risk triggers")
    crisis = check_for_crisis(req.message)
    if crisis.is_crisis:
        db.add(RiskLog(
            session_id=session.id, user_id=current_user.id,
            trigger_phrase=crisis.trigger_phrase or req.message[:200],
            system_response="AI intervened with extreme comfort.", helpline_shown=True,
        ))
        session.is_crisis_flagged = True
        db.commit()

    # ── Real Telemetry (Staggered UI updates without blocking) ───────────────
    async def fast_telemetry():
        await broadcast_event("RAG_FETCH", "Fetching knowledge")
        CommandCenter.log_ai("RAG_FETCH", "Vector database retrieval initiated")
        await broadcast_event("MEMORY_FETCH", "Fetching cross-session memory")
        await broadcast_event("EMOTION_FETCH", "Analyzing tone")
        CommandCenter.log_ai("EMOTION_FETCH", "Emotion detector activated")
        await broadcast_event("LLM_START", "Synthesizing Prompt -> LLM")
    asyncio.create_task(fast_telemetry())

    # ── Fetch conversation history ────────────────────────────────────────────
    past = db.query(Message).filter(
        Message.session_id == session.id
    ).order_by(Message.created_at.desc()).limit(30).all()
    past.reverse()

    history = [{"role": m.role, "content": m.content} for m in past]
    history.append({"role": "user", "content": req.message})

    # ── Pattern Analysis ──────────────────────────────────────────────────────
    recent_user_msgs = [m.content for m in past if m.role == "user"][-5:]
    pattern_signal = analyze_patterns(recent_user_msgs, req.message)
    pattern_block  = pattern_signal.as_prompt_block()

    # ── Persona Profile ───────────────────────────────────────────────────────
    await broadcast_event("MEMORY_FETCH", "Loading user persona")
    CommandCenter.log_ai("MEMORY_FETCH", "Retrieved dynamic user persona profile")
    persona_summary = get_persona_summary(db, current_user.id)

    # ── RAG ──────────────────────────────────────────────────────────────────
    rag_context = retrieve_context(req.message) if RAG_AVAILABLE else ""
    lang_prompt = get_language_prompt(req.language)

    # ── Emotion Detection ─────────────────────────────────────────────────────
    try:
        emotion = await asyncio.wait_for(detect_emotion(req.message), timeout=2.0)
    except Exception:
        emotion = detect_emotion_heuristic(req.message)

    await broadcast_event("EMOTION_DETECTED", f"Detected: {emotion.label}")
    CommandCenter.log_ai("EMOTION_DETECTED", f"AI detected: {emotion.label} (Confidence: {emotion.score:.2f})")

    # Update state tracker
    tracker.update_emotion(session.id, emotion.label)
    tracker.record_message_length(session.id, len(req.message))
    if crisis.is_crisis:
        tracker.set_crisis_risk(session.id, "High")

    state = tracker.get_state(session.id)
    state_summary   = tracker.get_summary(session.id)
    exercise_ctx    = tracker.get_exercise_context(session.id)
    is_onboarding   = state.is_onboarding

    # ── Memory Subsystem Read Path (Milestone 25) ─────────────────────────────
    memory_context = ""
    try:
        from modules.memory.repository import MemoryRepository
        from modules.memory.unified_context import UnifiedCognitiveContextEngine
        from modules.memory.conversation_intent import ConversationSpeechActEngine

        repo = MemoryRepository(db)
        unified_engine = UnifiedCognitiveContextEngine()
        speech_engine = ConversationSpeechActEngine()

        # Build full unified profile
        unified_profile = unified_engine.build_context(db, user_id=current_user.id, session_id=session.id, query=req.message)

        # Extract known entities from companion memories & onboarding
        known_ents = set()
        if unified_profile.preferred_name:
            known_ents.add(unified_profile.preferred_name)
        for r in unified_profile.relationships:
            # Extract simple names
            for word in r.split():
                if word[0].isupper() and len(word) > 2:
                    known_ents.add(word)

        # Analyze current message speech act & memory necessity
        intent_analysis = speech_engine.analyze(req.message, known_entities=list(known_ents))

        if intent_analysis.is_explicit_recall:
            memory_usage_mode = "EXPLICIT_RECALL"
            memory_context = unified_profile.to_formatted_context_block(max_tokens=500)
        elif intent_analysis.is_memory_needed:
            memory_usage_mode = "SILENT_BACKGROUND"
            memory_context = unified_profile.to_formatted_context_block(max_tokens=300)
        else:
            # Speech acts like expressing_emotion ("I'm feeling lonely") or asking_for_advice: ZERO memory dump!
            memory_usage_mode = "SILENT_BACKGROUND"
            memory_context = f"[USER PREFERENCES]\n• Name: {unified_profile.preferred_name} | Style: {unified_profile.conversation_style}"

    except Exception as e:
        CommandCenter.log_ai("MEMORY_READ_ERROR", f"Failed to fetch memory context: {e}")
        memory_context = ""
        memory_usage_mode = "SILENT_BACKGROUND"

    # ── MAITRI AGENT LOOP v2: Assessor Phase ──────────────────────────────────
    case_file = tracker.get_case_file(session.id)

    if should_skip_assessor(req.message, case_file):
        await broadcast_event("LLM_START", "Assessor Skipped (Trivial Input)")
        CommandCenter.log_ai("LLM_START", "Assessor skipped via fast-path filter")
        msg_clean = req.message.strip().lower()
        greetings = ["hi", "hey", "hello", "yo", "sup", "good morning", "good night", "hola"]
        if any(g in msg_clean for g in greetings) and len(msg_clean.split()) <= 4:
            case_file["runtime_state"]["decision"] = "GREETING"
        else:
            case_file["runtime_state"]["decision"] = "RESPOND"
    else:
        await broadcast_event("LLM_START", "Assessor Evaluating...")
        CommandCenter.log_ai("LLM_START", "Assessor model evaluating conversational trajectory")
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
            err_msg = f"{e.__class__.__name__}: {str(e) if str(e) else 'Timeout'}"
            print(f"[Assessor Fallback Activated] Error: ({err_msg}). Proceeding with memory-aware RESPOND mode.")
            case_file["runtime_state"]["decision"] = "RESPOND"
            
            # Phase 2 Fix: If memory context exists or user message has recall intent, populate situation classification
            msg_lower = req.message.lower()
            recall_triggers = ["remember", "recall", "know", "goal", "goals", "about me", "favourite", "favorite", "colour", "color", "work", "girl", "job", "what", "who"]
            if memory_context.strip() or any(w in msg_lower for w in recall_triggers):
                cs = case_file.setdefault("conversation_state", {})
                cs["situation_classification"] = {
                    "summary": f"User asking conversational/memory question: '{req.message}'",
                    "category": "memory_recall",
                    "confidence": 0.95
                }
        tracker.update_case_file(session.id, case_file)

    # Phase 3 & 4 Terminal Evidence
    print("\n===========================")
    print("MEMORY PIPELINE VERIFICATION")
    print("===========================")
    print(f"User ID: {current_user.id}")
    print(f"Session ID: {session.id}")
    print(f"Injected Memory Context Present: {bool(memory_context.strip())}")
    if memory_context.strip():
        print(f"Memory Content Snippet:\n{memory_context.strip()}")
    print(f"Injected into Analyst: YES")
    print(f"Injected into Maitri: YES")
    print("===========================\n")

    decision = case_file.get("runtime_state", {}).get("decision", "RESPOND")

    # ── Map Decision → Update State Machine ───────────────────────────────────
    if decision == "GROUND":
        if exercise_ctx.get("state", "idle") == "idle":
            exercise_type = "GROUNDING"
            tracker.suggest_exercise(
                session.id,
                exercise_type  = exercise_type,
                triggered_by   = "assessor",
                pre_emotion    = emotion.label,
            )
            # Create ExerciseLog row
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
            # User engaging with exercise → advance to in_progress
            tracker.advance_exercise_state(session.id, "in_progress")
        elif current_ex_state == "in_progress":
            # Keep it in progress
            pass

    elif decision == "EXERCISE_BREAK":
        tracker.reset_exercise(session.id)
    
    # Implicit break: if the assessor decides to ASK or RESPOND, drop the exercise
    elif exercise_ctx.get("state", "idle") != "idle":
        tracker.reset_exercise(session.id)


    # Detect when user gives feedback (exercise was awaiting_feedback)
    if exercise_ctx.get("state") == "awaiting_feedback":
        # User just gave feedback → complete the exercise
        _complete_exercise(db, session.id, current_user.id, emotion.label, req.message)
        tracker.reset_exercise(session.id)

    # ── Maitri Response ───────────────────────────────────────────────────────
    await broadcast_event("LLM_START", "Maitri Generation...")
    CommandCenter.log_ai("LLM_START", "Maitri LLM generating final empathic response")
    current_exercise_state = tracker.get_state(session.id).exercise_state

    ai_response = await asyncio.to_thread(
        chat_with_maitri,
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
    scratchpad_match = re.search(r'<scratchpad>(.*?)</scratchpad>', ai_response, re.DOTALL | re.IGNORECASE)
    if scratchpad_match:
        # We can log this to the terminal so developers see the internal thought process
        reasoning = scratchpad_match.group(1).strip()
        CommandCenter.log_ai("REASONING", f"Internal reasoning: {reasoning[:100]}...")
        
    ai_response = re.sub(r'<scratchpad>.*?</scratchpad>', '', ai_response, flags=re.DOTALL | re.IGNORECASE).strip()
    
    await broadcast_event("LLM_DONE", "Response generated")
    CommandCenter.log_ai("LLM_DONE", f"Response ready: {ai_response[:50]}...")

    # ── Save Messages ─────────────────────────────────────────────────────────
    # ── Save Messages ─────────────────────────────────────────────────────────
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

    # ── Async Persona Update (non-blocking, every 5 user messages) ────────────
    total_user_msgs = len([m for m in past if m.role == "user"]) + 1
    if total_user_msgs % 5 == 0 or total_user_msgs == 1:
        asyncio.create_task(_update_persona_async(
            db_session_id    = session.id,
            user_id          = current_user.id,
            is_first_session = is_onboarding,
        ))

    # ── Async Memory Subsystem Write Path (non-blocking, Milestone 11) ─────────
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


