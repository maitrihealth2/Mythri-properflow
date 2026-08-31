"""
Neural Assessor — The 'Psychologically Neutral' Mental Model.
Performs clinical-style context analysis (hidden from the user) to inform Mythri's responses.
(Supersedes the old Phase Analyst)
"""
import os
import json
from openai import AsyncOpenAI
from dotenv import load_dotenv
import pathlib

_BASE = pathlib.Path(__file__).resolve().parent.parent.parent
load_dotenv(_BASE / ".env")
load_dotenv(_BASE / ".env.local", override=True)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_BASE_URL = "https://api.sarvam.ai/v1"
MODEL = "sarvam-105b-conversations"

from providers.sarvam.sarvam_client import ASSESSOR_PROMPT


def should_skip_assessor(user_message: str, case_file: dict) -> bool:
    """
    Code-level skip filter — runs BEFORE any model call, zero latency cost.
    """
    GREETING_PATTERNS = ["hi", "hey", "hello", "yo", "sup", "good morning", "good night", "hola"]
    SMALLTALK_PATTERNS = ["how's your day", "what's up", "weather", "bored", "lol", "nm", "nothing much"]
    TRIVIAL_ACK = ["ok", "okay", "fine", "yeah", "cool", "alright", "hmm", "k", "yep", "yes", "no", "nah"]

    msg = user_message.strip().lower()
    word_count = len(msg.split())

    # Never skip if an exercise or crisis flag is already active -- those always
    # need the assessor to check for escalation/break signals.
    if case_file.get("runtime_state", {}).get("exercise_in_progress"):
        return False
    if case_file.get("conversation_state", {}).get("risk_level") not in (None, "none", "Low"): # Note: State tracker uses 'Low' by default
        return False

    import re
    if word_count <= 2 and msg in TRIVIAL_ACK:
        return True
    if any(re.search(rf"\b{re.escape(p)}\b", msg) for p in GREETING_PATTERNS) and word_count <= 4:
        return True
    if any(re.search(rf"\b{re.escape(p)}\b", msg) for p in SMALLTALK_PATTERNS) and word_count <= 6:
        return True
    return False


from ai_engine.state_extractor import StateExtractor
from ai_engine.ranking_algorithm import RankingAlgorithm, Concern

NEW_ASSESSOR_PROMPT = """You are Mythri's internal state extraction engine.
Analyze the user's latest message and output a strict JSON object with exactly two top-level keys: "state" and "concerns".
"state" must contain the 10 core parameters based on the current message:
{
  "emotion": "string (e.g. Happy, Sad)",
  "intensity": float (0.0 to 1.0),
  "distress": float (0.0 to 1.0),
  "intent": "string (e.g. Venting, Seeking advice)",
  "arousal": float (0.0 to 1.0),
  "sensitivity": float (0.0 to 1.0),
  "engagement": float (0.0 to 1.0),
  "concern": "string (Primary topic)",
  "risk_level": "Low/Moderate/High",
  "risk_score": float (0.0 to 1.0)
}
"concerns" must be an array of objects if the user mentions multiple problems, otherwise an empty array:
[{
  "name": "string",
  "intensity": float (0.0 to 1.0),
  "distress": float (0.0 to 1.0),
  "sensitivity": float (0.0 to 1.0),
  "recurrence": float (0.0 to 1.0),
  "relevance": float (0.0 to 1.0),
  "risk": float (0.0 to 1.0)
}]
CRITICAL: ONLY OUTPUT VALID JSON. Do not include markdown formatting.
"""

async def assess_turn(
    messages: list[dict],
    case_file: dict,
    user_message: str,
    emotion_label: str = "",
    rag_context: str = "",
    pattern_block: str = "",
    persona_summary: str = "",
    memory_context: str = "",
) -> dict:
    """
    Call the internal assessor model to extract the 10 parameters and rank concerns.
    Updates the case file JSON.
    """
    from providers.sarvam.sarvam_client import get_async_client
    client = get_async_client()

    # Convert last 3 exchanges to string
    last_3 = ""
    for m in messages[-6:]:
        last_3 += f"{m['role'].capitalize()}: {m['content']}\n"

    input_text = (
        f"Last 3 exchanges:\n{last_3}\n"
        f"Latest user message: {user_message}\n\n"
    )

    if emotion_label or pattern_block or persona_summary or rag_context or memory_context:
        input_text += "--- ADDITIONAL CONTEXT ---\n"
        if emotion_label:
            input_text += f"Detector Emotion: {emotion_label}\n"
        if pattern_block:
            input_text += f"Pattern Analysis: {pattern_block}\n"
        if persona_summary:
            input_text += f"Persona Summary: {persona_summary}\n"

    analysis_input = [
        {"role": "system", "content": NEW_ASSESSOR_PROMPT},
        {"role": "user", "content": input_text},
    ]

    import time
    t0_assessor = time.perf_counter()

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=analysis_input,
            temperature=0.1,   # Very low for structured output consistency
            max_tokens=800,
        )
        content = response.choices[0].message.content
        
        # Token logging
        try:
            from utils.token_counter import count_tokens, count_messages_tokens
            from core.logger.terminal import CommandCenter
            in_toks = count_messages_tokens(analysis_input)
            out_toks = count_tokens(content or "")
            dur_ms = (time.perf_counter() - t0_assessor) * 1000
            CommandCenter.log_tokens("Neural Assessor", in_toks, out_toks, dur_ms)
        except Exception:
            pass

        # Clean up any potential markdown formatting
        clean_content = (content or "").strip()
        if clean_content.startswith("```json"):
            clean_content = clean_content[7:]
        if clean_content.startswith("```"):
            clean_content = clean_content[3:]
        if clean_content.endswith("```"):
            clean_content = clean_content[:-3]
        clean_content = clean_content.strip()
            
        if not clean_content:
            raise ValueError("Empty LLM response")

        extracted_data = json.loads(clean_content)
        
        # 1. Extract 10 parameters
        state_dict = extracted_data.get("state", {})
        user_state = StateExtractor.extract_state(state_dict)
        
        # 2. Rank Concerns if any
        concerns_list = extracted_data.get("concerns", [])
        parsed_concerns = [Concern(**c) for c in concerns_list]
        ranked_concerns = RankingAlgorithm.rank_concerns(parsed_concerns)
        
        # 3. Build updated case file
        updated_case_file = dict(case_file)
        
        # Store 10 params
        updated_case_file["core_parameters"] = user_state.model_dump()
        updated_case_file["ranked_concerns"] = ranked_concerns
        
        # Maintain backward compatibility for support_router / api.py before full refactor
        if "conversation_state" not in updated_case_file:
            updated_case_file["conversation_state"] = {}
        updated_case_file["conversation_state"]["risk_level"] = user_state.risk_level.lower()
        updated_case_file["conversation_state"]["engagement"] = user_state.engagement
        
        if "emotional_state" not in updated_case_file:
            updated_case_file["emotional_state"] = {}
        updated_case_file["emotional_state"]["primary"] = user_state.emotion
        updated_case_file["emotional_state"]["intensity"] = user_state.intensity
        
        if "runtime_state" not in updated_case_file:
            updated_case_file["runtime_state"] = {"response_strategy": "LISTEN"}
            
        return updated_case_file
    except Exception as e:
        print(f"Assessor JSON Error: {e}")
        print(f"Raw Output was: {content if 'content' in locals() else 'None'}")
        if "runtime_state" not in case_file: case_file["runtime_state"] = {}
        case_file["runtime_state"]["response_strategy"] = "LISTEN"
        return case_file
