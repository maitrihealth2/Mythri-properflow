"""
Neural Assessor — The 'Psychologically Neutral' Mental Model.
Performs clinical-style context analysis (hidden from the user) to inform Maitri's responses.
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
MODEL = "sarvam-105b"

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

    if word_count <= 2 and msg in TRIVIAL_ACK:
        return True
    if any(p in msg for p in GREETING_PATTERNS) and word_count <= 4:
        return True
    if any(p in msg for p in SMALLTALK_PATTERNS) and word_count <= 6:
        return True
    return False


async def assess_turn(
    messages: list[dict],
    case_file: dict,
    user_message: str,
    emotion_label: str = "",
    rag_context: str = "",
    pattern_block: str = "",
    persona_summary: str = "",
) -> dict:
    """
    Call the internal assessor model to update the case file JSON.
    """
    client = AsyncOpenAI(api_key=SARVAM_API_KEY, base_url=SARVAM_BASE_URL, timeout=10.0)

    # Convert last 3 exchanges to string
    last_3 = ""
    for m in messages[-6:]:
        last_3 += f"{m['role'].capitalize()}: {m['content']}\n"

    input_text = (
        f"Case file: {json.dumps(case_file, indent=2)}\n\n"
        f"Last 3 exchanges:\n{last_3}\n"
        f"Latest user message: {user_message}\n\n"
    )

    if emotion_label or pattern_block or persona_summary or rag_context:
        input_text += "--- ADDITIONAL CONTEXT ---\n"
        if emotion_label:
            input_text += f"Detector Emotion: {emotion_label}\n"
        if pattern_block:
            input_text += f"Pattern Analysis: {pattern_block}\n"
        if persona_summary:
            input_text += f"Persona Summary: {persona_summary}\n"
        if rag_context:
            input_text += f"Therapeutic RAG: {rag_context}\n"

    # Add a strict instruction for Sarvam to only return JSON
    system_prompt = ASSESSOR_PROMPT + "\n\nCRITICAL: You must return ONLY valid JSON. Do not include markdown formatting like ```json or any other text."

    analysis_input = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": input_text},
    ]

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=analysis_input,
            temperature=0.1,   # Very low for structured output consistency
            max_tokens=800,
        )
        content = response.choices[0].message.content
        
        # Clean up any potential markdown formatting
        clean_content = (content or "").strip()
        if clean_content.startswith("```json"):
            clean_content = clean_content[7:]
        if clean_content.startswith("```"):
            clean_content = clean_content[3:]
        if clean_content.endswith("```"):
            clean_content = clean_content[:-3]
        clean_content = clean_content.strip()
            
        updated_case_file = json.loads(clean_content)
        if isinstance(updated_case_file, dict):
            # Ensure critical keys exist
            if "runtime_state" not in updated_case_file:
                updated_case_file["runtime_state"] = case_file.get("runtime_state", {"decision": "RESPOND"})
            if "conversation_state" not in updated_case_file:
                updated_case_file["conversation_state"] = case_file.get("conversation_state", {})
            
            cs = updated_case_file["conversation_state"]
            if "hypotheses" not in cs:
                cs["hypotheses"] = case_file.get("conversation_state", {}).get("hypotheses", {"Unknown": 100.0})
            if "phase" not in cs:
                cs["phase"] = case_file.get("conversation_state", {}).get("phase", "Listen")
            return updated_case_file
        return case_file
    except Exception as e:
        print(f"Assessor JSON Error: {e}")
        print(f"Raw Output was: {content if 'content' in locals() else 'None'}")
        case_file["runtime_state"]["decision"] = "RESPOND"
        return case_file
