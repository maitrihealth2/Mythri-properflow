import re

with open(r'd:\Copy\V4\Mythri New\backend\modules\consultation\api.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'@router\.post\("/message"\).*?(?=@router\.get\("/history"\))', re.DOTALL)

replacement = """@router.post("/message")
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
    session = await asyncio.to_thread(_get_session)
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

    def _get_past_messages():
        past_msgs = db.query(Message).filter(
            Message.session_id == session.id
        ).order_by(Message.created_at.desc()).limit(30).all()
        past_msgs.reverse()
        return past_msgs

    def _fetch_rag():
        return retrieve_context(req.message) if RAG_AVAILABLE else ""

    def _get_emotion_sync():
        try:
            loop = asyncio.new_event_loop()
            emo = loop.run_until_complete(detect_emotion(req.message))
            loop.close()
            return emo
        except Exception:
            return detect_emotion_heuristic(req.message)

    def _run_crse_pipeline():
        from modules.memory.repository import MemoryRepository
        from modules.memory.unified_context import UnifiedCognitiveContextEngine
        from modules.memory.conversation_intent import ConversationSpeechActEngine
        from modules.memory.context_relevance import ContextRelevanceSelector

        unified_engine = UnifiedCognitiveContextEngine()
        speech_engine = ConversationSpeechActEngine()
        crse = ContextRelevanceSelector()

        unified_profile = unified_engine.build_context(
            db, user_id=current_user.id, session_id=session.id, query=req.message
        )
        known_ents = set()
        if unified_profile.preferred_name: known_ents.add(unified_profile.preferred_name)
        for r in unified_profile.relationships:
            for word in r.split():
                clean_word = word.strip(".,;:!\\\"'")
                if clean_word and clean_word[0].isupper() and len(clean_word) > 2:
                    known_ents.add(clean_word)

        intent_analysis = speech_engine.analyze(req.message, known_entities=list(known_ents))
        return crse.select(
            message=req.message,
            intent=intent_analysis,
            profile=unified_profile,
            known_entities=list(known_ents),
        )

    results = await asyncio.gather(
        asyncio.to_thread(_get_past_messages),
        asyncio.to_thread(_fetch_rag),
        asyncio.to_thread(_get_emotion_sync),
        asyncio.to_thread(_run_crse_pipeline),
        asyncio.to_thread(get_persona_summary, db, current_user.id),
        return_exceptions=True
    )
    
    past = results[0] if not isinstance(results[0], Exception) else []
    rag_context = results[1] if not isinstance(results[1], Exception) else ""
    emotion = results[2] if not isinstance(results[2], Exception) else detect_emotion_heuristic(req.message)
    selection = results[3] if not isinstance(results[3], Exception) else None
    persona_summary = results[4] if not isinstance(results[4], Exception) else ""
    
    t_context = time.time()

    memory_context = selection.to_prompt_block() if selection else ""
    memory_usage_mode = selection.selection_mode if selection else "SILENT_BACKGROUND"

    history = [{"role": "assistant" if m.role == "mythri" else m.role, "content": m.content} for m in past]
    history.append({"role": "user", "content": req.message})

    recent_user_msgs = [m.content for m in past if m.role == "user"][-5:]
    pattern_signal = await asyncio.to_thread(analyze_patterns, recent_user_msgs, req.message)
    pattern_block = pattern_signal.as_prompt_block()
    
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
                timeout=5.0
            )
        except Exception:
            if "runtime_state" not in case_file: case_file["runtime_state"] = {}
            case_file["runtime_state"]["response_strategy"] = "LISTEN"
        tracker.update_case_file(session.id, case_file)
    
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
            
            import re
            exercise_match = re.search(r'<EXERCISE>\s*({.*?})\s*</EXERCISE>', final_text, flags=re.DOTALL | re.IGNORECASE)
            if exercise_match:
                try:
                    dynamic_ex_str = exercise_match.group(1).strip()
                    import json
                    json.loads(dynamic_ex_str)
                    tracker.suggest_exercise(session.id, exercise_type=dynamic_ex_str, triggered_by="llm", pre_emotion=emotion.label if emotion else "neutral")
                    
                    exercise_ctx = tracker.get_state(session.id)
                    if exercise_ctx.exercise_state == "idle":
                        tracker.advance_exercise_state(session.id, "suggested")
                except Exception as e:
                    print(f"[PostProcess] Exercise parsing error: {e}")
            
            from rag.brain.evaluator import evaluate_response_async
            await evaluate_response_async(ai_msg.id)
            
            total_user_msgs = len([m for m in past if m.role == "user"]) + 1
            if total_user_msgs % 5 == 0 or total_user_msgs == 1:
                await _update_persona_async(session.id, current_user.id, is_onboarding)
                
            await _process_memory_write_path_async(current_user.id, req.message, session.id)
        except Exception as e:
            print(f"[PostProcess] Error: {e}")
            bg_db.rollback()
        finally:
            bg_db.close()

    print(f"\\n--- TTFT PARALLEL BREAKDOWN (Session {session.id}) ---")
    print(f"Session setup: {t_session - t_start:.3f}s")
    print(f"Parallel Block: {t_context - t_session:.3f}s")
    print(f"Assessor: {t_assessor - t_context:.3f}s")
    print(f"Total Time to LLM Stream: {time.time() - t_start:.3f}s\\n")

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
        yield json.dumps(init_metadata) + "\\n"

        full_text = ""
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
                if not chunk_raw: continue
                yield chunk_raw
                try:
                    obj = json.loads(chunk_raw.strip())
                    if obj.get("type") == "metadata" and obj.get("full_text"):
                        full_text = obj.get("full_text")
                except:
                    pass
        finally:
            if full_text:
                background_tasks.add_task(post_process_message, full_text)

    return StreamingResponse(response_generator(), media_type="application/x-ndjson")

def _complete_exercise(db: Session, session_id: int, user_id: int, post_emotion: str, feedback_text: str):
    \"\"\"Mark the most recent in-progress ExerciseLog as completed.\"\"\"
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
    \"\"\"Non-blocking persona update — runs in background after response is sent.\"\"\"
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
    \"\"\"
    Milestone 11 Write-Path Integration Worker.
    Executes MemoryManager asynchronously after client response generation.
    Completely isolated so background errors never impact user turn responses.
    \"\"\"
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

"""

new_content = pattern.sub(replacement, content)

with open(r'd:\Copy\V4\Mythri New\backend\modules\consultation\api.py', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Successfully replaced the code block in api.py.")
