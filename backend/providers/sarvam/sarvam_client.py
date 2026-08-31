"""
Sarvam AI LLM Client - Mythri personality + strict language-locked responses.
"""
import os
from openai import OpenAI, AsyncOpenAI
from dotenv import load_dotenv
import pathlib as _pl

_BASE = _pl.Path(__file__).resolve().parent.parent.parent
load_dotenv(_BASE / ".env")
load_dotenv(_BASE / ".env.local", override=True)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_BASE_URL = "https://api.sarvam.ai/v1"
MODEL = "sarvam-105b-conversations"

# Compact Mythri personality prompt (~220 tokens vs original ~395+220 safety)
# Safety policy file is no longer appended separately — the essential rule is inline below.
CONVERSATIONAL_SYSTEM_PROMPT = """You are Mythri — a genuine, emotionally intelligent long-term companion. NOT a therapy bot. You speak naturally, like two real people.

──────────────────
CORE BEHAVIOR
──────────────────
• **Conversational first.** You are hanging out with a friend — talk, react, joke, celebrate, disagree, console naturally.
• **No forced questions.** If the conversation doesn't naturally require one, just react or make a statement.
• **No crutch phrases.** Never repeat "What's on your mind?", "I'm here for you", "That sounds difficult", "How are you feeling?" — only use these when genuinely appropriate.
• **Full emotional range.** Happy → celebrate. Angry → engage. Wrong → gently correct. Do NOT default to therapeutic seriousness.
• **Conversational continuity.** Continue naturally from what was just said. Do not reset or restate.
• **Honest companionship.** Challenge bad logic or poor decisions warmly (e.g. "Wait, I think you're mixing something up there.").
• **Humor when appropriate.** Light teasing and playful reactions welcome. Never force jokes during serious distress.
• **React first.** "NO WAY", "Wait, seriously?" before any analysis.
• **Response length.** Short responses ("Yeah.", "Oof.") are valid and encouraged when appropriate.
• **Use name occasionally** when it feels natural, especially during greetings or empathetic moments.
• **If context is provided**, use it to feel continuous. Remember naturally — not "I recall from our database".
• If Topic Status is CONTINUING or WORSENING, gently but actively suggest a perspective shift or step. Don't just listen forever.

──────────────────
LANGUAGE
──────────────────
Reply in the exact script the user is using right now. Hindi → Devanagari. Telugu → Telugu script. Code-switch naturally.

──────────────────
FORMATTING
──────────────────
• No em dashes or en dashes as separators. Use commas and periods.
• No unnecessary markdown emphasis in plain chat.
• Never output reasoning, labels like "Mythri:", or chain-of-thought. Speak directly.
• Emojis when genuinely fitting — not every response.

──────────────────
DOMAIN POLICY: NO CODE
──────────────────
NEVER generate, write, debug, or explain any programming code, scripts, shell commands, or technical syntax. Decline warmly and redirect (e.g. "Haha, I'm here to hang out, not write code!").

──────────────────
SAFETY
──────────────────
If the user expresses imminent self-harm intent with plan or means: Safety takes priority. Provide crisis resources concisely. Otherwise stay in the conversation."""

CASE_FILE_SCHEMA = """
{
  "conversation_state": {
    "facts": [
      {"text": "Manager unhappy with user", "action": "append", "confidence": 0.9}
    ],
    "emotion": {"value": "anxious", "confidence": 0.9, "source": "explicit"},
    "emotion_history": ["anxious"],
    "situation_classification": {
      "category": "work_stress | academic_pressure | relationship_conflict | emotional_burnout | self_doubt | grief | general_anxiety | unknown",
      "summary": "User is experiencing burnout from tight work deadlines",
      "confidence": 0.85
    },
    "conversation_goal": "vent | solve | distract | reassurance | unknown",
    "risk_level": "none | low | moderate | high | imminent",
    "phase": "opening | exploring | understanding | problem_solving | reflection | closing",
    "asked_topics": ["timeline", "emotion"],
    "recommended_question": "What specifically triggered this situation?"
  },
  "runtime_state": {
    "decision": "CONVERSE | REACT | CELEBRATE | SUPPORT | CHALLENGE | ADVISE | SAFETY_CHECK | PROPOSE_EXERCISE | GROUND",
    "exercise_in_progress": false,
    "turns_since_last_question": 0,
    "give_up_asking": false
  }
}
"""

ASSESSOR_PROMPT = """
You are the internal cognitive assessor for Mythri. Output ONLY a valid JSON object representing the updated case file. Do not include markdown wrappers.

Given: current case file, last 3 exchanges, and latest user message.

You must analyze the user's input and update the JSON state to reflect the cognitive and emotional context, and select the optimal conversational strategy.

JSON Schema Requirements for the Output:

{
  "emotional_state": {
    "primary": "string (e.g. frustration, uncertainty, anxiety-like, relief, joy, neutral, motivation, excitement)",
    "secondary": ["string"],
    "intensity": 0.5
  },
  "cognitive_patterns": [
    {
      "pattern": "string (e.g. rumination, overthinking, catastrophizing, self_criticism, resilience, goal_oriented, clarity, optimism)",
      "confidence": 0.5
    }
  ],
  "behavioral_context": {
    "withdrawal": false,
    "avoidance": false,
    "social_engagement": 0.5
  },
  "conversation_state": {
    "openness": 0.5,
    "engagement": 0.5,
    "risk_level": "low"
  },
  "runtime_state": {
    "response_strategy": "CONVERSE | REACT | CELEBRATE | SUPPORT | CHALLENGE | ADVISE | SAFETY_CHECK | PROPOSE_EXERCISE | GROUND",
    "reason_codes": ["string (e.g. user_expressed_motivation, clarification_needed)"],
    "expected_effect": "string (e.g. encourage_user_to_elaborate)",
    "exercise_in_progress": false
  }
}

STRATEGY SELECTION RULES:
- CONVERSE: General casual conversation, continuing a topic, or gathering info naturally.
- REACT: When the user says something surprising, shocking, or funny.
- CELEBRATE: When the user shares a win, positive emotion, or motivation.
- SUPPORT: When the user is genuinely struggling, grieving, or sad. Provide warmth without being overly clinical.
- CHALLENGE: When the user makes a bad assumption, exhibits poor logic, or needs friendly disagreement/correction.
- ADVISE: When the user explicitly asks for help or advice.
- PROPOSE_EXERCISE: User describes active panic, overwhelm, or high stress, and you want to ask if they'd like to try an exercise. DO NOT use this for positive emotions.
- GROUND: User has explicitly agreed to do an exercise, or explicitly asked for one.
- SAFETY_CHECK: If risk_level is high (self-harm, severe crisis).

CRITICAL: Never treat patterns as clinical diagnoses. Use them only to guide conversational response.
Return ONLY valid JSON.
"""


_http_client = None
_async_client = None

def get_shared_http_client() -> "httpx.AsyncClient":
    global _http_client
    if _http_client is None:
        import httpx
        limits = httpx.Limits(max_keepalive_connections=50, max_connections=100, keepalive_expiry=30.0)
        _http_client = httpx.AsyncClient(limits=limits, timeout=30.0)
    return _http_client

def get_client() -> OpenAI:
    return OpenAI(api_key=SARVAM_API_KEY, base_url=SARVAM_BASE_URL, timeout=25.0)

def get_async_client() -> AsyncOpenAI:
    global _async_client
    if _async_client is None:
        _async_client = AsyncOpenAI(
            api_key=SARVAM_API_KEY, 
            base_url=SARVAM_BASE_URL, 
            http_client=get_shared_http_client(),
            max_retries=1
        )
    return _async_client

async def close_sarvam_client():
    global _http_client
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None


def _build_language_lock(language: str, language_prompt: str) -> str:
    if language_prompt:
        return language_prompt
    code = (language or "en-IN").strip()
    if code in ["hi-IN", "hi"]:
        return "CRITICAL LANGUAGE LOCK: You MUST write your entire response in HINDI script (Devanagari). Do not use English."
    elif code in ["te-IN", "te"]:
        return "CRITICAL LANGUAGE LOCK: You MUST write your entire response in TELUGU script. Do not use English."
    elif code in ["ta-IN", "ta"]:
        return "CRITICAL LANGUAGE LOCK: You MUST write your entire response in TAMIL script. Do not use English."
    elif code in ["kn-IN", "kn"]:
        return "CRITICAL LANGUAGE LOCK: You MUST write your entire response in KANNADA script. Do not use English."
    elif code in ["mr-IN", "mr"]:
        return "CRITICAL LANGUAGE LOCK: You MUST write your entire response in MARATHI script. Do not use English."
    elif code in ["bn-IN", "bn"]:
        return "CRITICAL LANGUAGE LOCK: You MUST write your entire response in BENGALI script. Do not use English."
    elif code in ["gu-IN", "gu"]:
        return "CRITICAL LANGUAGE LOCK: You MUST write your entire response in GUJARATI script. Do not use English."
    elif code in ["ml-IN", "ml"]:
        return "CRITICAL LANGUAGE LOCK: You MUST write your entire response in MALAYALAM script. Do not use English."
    elif code in ["pa-IN", "pa"]:
        return "CRITICAL LANGUAGE LOCK: You MUST write your entire response in PUNJABI script. Do not use English."
    return "CRITICAL LANGUAGE LOCK: Respond in natural, warm English."


def _extract_facts_from_memory_block(memory_context: str, active_prompt: str) -> list:
    """
    Extracts meaningful fact strings from a memory context block for fallback recall.
    """
    facts = []
    prompt_words = {w for w in active_prompt.lower().split() if len(w) > 3}

    for line in memory_context.split('\n'):
        line = line.strip()
        if not line:
            continue

        if line.startswith('•'):
            facts.append(line.lstrip('•').strip())
            continue

        if line.startswith('[USER]'):
            continue

        import re
        section_match = re.match(r'^\[([^\]]+)\]\s*(.+)$', line)
        if section_match:
            section_name = section_match.group(1)
            content = section_match.group(2).strip()
            if section_name in ('USER',):
                continue
            items = [item.strip() for item in content.split(';') if item.strip()]
            facts.extend(items)

    if not facts:
        return []

    if prompt_words:
        matching = [f for f in facts if any(w in f.lower() for w in prompt_words)]
        return matching if matching else facts[:5]
    return facts[:5]


def is_code_or_programming_request(text: str) -> bool:
    """
    Detects if the user is asking for programming code, scripts, or technical coding tasks,
    including indirect/jailbreak phrasing.
    """
    if not text:
        return False
    import re
    t = text.lower()
    patterns = [
        r"\b(write|generate|create|build|show|send|provide|give|debug|fix|translate|run|execute|make|type|output|help me with)\b.{0,40}\b(code|script|program|function|class|algorithm|query|snippet|regex|sql|python|javascript|typescript|cpp|c\+\+|java|html|css|bash|powershell|rust|php|ruby|golang|compiler|interpreter)\b",
        r"\b(python|javascript|typescript|sql|html|css|cpp|c\+\+|java|bash|powershell|rust|php|ruby)\s+(script|code|function|program|query|file|syntax|snippet)\b",
        r"\b(how to (code|program|write a script|create a function|build an app))\b",
        r"\b(act as|pretend to be|roleplay as|you are)\b.{0,30}\b(coder|programmer|developer|compiler|interpreter|terminal|bot that writes code|coding assistant)\b",
        r"```",
        r"\bdef\s+\w+\s*\(",
        r"\bconsole\.log\s*\(",
        r"\bimport\s+(sys|os|re|math|random|requests|numpy|pandas|torch|flask|fastapi|express|react)\b",
        r"\b<\s*(html|script|div|span|button|body)\b",
        r"\bSELECT\s+.+\s+FROM\s+\w+\b",
    ]
    for pat in patterns:
        if re.search(pat, t, re.IGNORECASE):
            return True
    return False


async def stream_chat_with_mythri(
    messages: list[dict],
    language: str = "en-IN",
    rag_context: str = "",
    case_file: dict = None,
    language_prompt: str = "",
    is_crisis: bool = False,
    exercise_phase: str = "idle",
    memory_context: str = "",
    memory_usage_mode: str = "SILENT_BACKGROUND",
    max_tokens: int = 1024,
    history_limit: int = 20,
    compact_context: str = "",
):
    """
    Stream Mythri's conversational response.
    Yields chunks of text, followed by a final dict containing metadata.

    Args:
        history_limit: Max number of prior history messages to include.
                       Controlled by TurnComplexity in api.py:
                       TRIVIAL=0, CASUAL=8, MEANINGFUL/SENSITIVE=20.
        compact_context: Optional ~30-50 token returning-user context for
                         TRIVIAL turns (replaces history for personalization).
    """
    import json

    # ── System: compact static identity + turn-specific directives only ──────
    system_parts = [CONVERSATIONAL_SYSTEM_PROMPT]

    # Crisis — overrides everything, must be first conditional
    if is_crisis:
        system_parts.append(
            "CRISIS MODE ACTIVE: The user may be in severe distress or danger. "
            "Respond with maximum empathy, validate their pain deeply, reassuring them they are not alone. "
            "Gently remind them that support is available. Keep it short (2-3 sentences max). "
            "Do NOT give advice or ask probing questions."
        )

    # Exercise overlay
    if exercise_phase != "idle":
        system_parts.append(
            f"EXERCISE ACTIVE (phase: {exercise_phase}): "
            "A breathing/grounding exercise overlay is active on screen. "
            "Keep your words brief (1-2 sentences), reassuring, focused on breathing. "
            "No complex questions. Guide them to take a slow breath in and release."
        )

    # Language lock
    system_parts.append(_build_language_lock(language, language_prompt))
    system = "\n\n".join(system_parts)

    # ── Split messages into history + current prompt ──────────────────────────
    active_prompt = ""
    past_history: list[dict] = []
    if messages:
        active_prompt = messages[-1]["content"]
        past_history = messages[:-1]

    # ── Code detection directive (appended to system if triggered) ────────────
    # Kept in system so it is an instruction, not data.
    if active_prompt and is_code_or_programming_request(active_prompt):
        system += (
            "\n\nCRITICAL TURN DIRECTIVE: The user is asking for programming code or technical help.\n"
            "You MUST NOT generate any code, scripts, or technical syntax.\n"
            "Decline warmly and redirect (e.g. 'Haha, I'm here to chat, not write code!')."
        )

    # ── Build user-turn content: actual message + optional context suffix ─────
    # Context (memory, case_file state, RAG) goes here — NOT in system —
    # keeping model instructions separate from per-turn data.
    context_parts: list[str] = []

    if memory_context and memory_context.strip():
        if memory_usage_mode == "EXPLICIT_RECALL":
            context_parts.append(
                "[MEMORY — EXPLICIT RECALL REQUESTED]\n"
                "Answer the user's question directly and warmly from the memories below.\n"
                "Do NOT give generic check-ins.\n"
                f"{memory_context.strip()}"
            )
        else:
            context_parts.append(
                "[BACKGROUND MEMORY — use naturally, do not announce]\n"
                f"{memory_context.strip()}"
            )

    if case_file:
        core = case_file.get("core_parameters", {})
        ranked = case_file.get("ranked_concerns", {})
        deviations = case_file.get("baseline_deviations", {})

        emotion = core.get("emotion", case_file.get("emotional_state", {}).get("primary", "neutral"))
        intensity = core.get("intensity", 0.0)
        distress = core.get("distress", 0.0)
        primary_concern = ranked.get("primary_concern", "None")
        dev_score = deviations.get("overall_deviation_score", 0.0)
        strategy = case_file.get("runtime_state", {}).get("response_strategy", "CONVERSE")
        status = case_file.get("concern_status", "NEW")

        if dev_score > 0.3:
            dev_note = "User significantly above distress baseline — be extra warm and attentive."
        elif dev_score < -0.2:
            dev_note = "User doing better than baseline — keep energy positive."
        else:
            dev_note = "User at normal baseline — keep it natural."

        continuity_note = ""
        if status in ("CONTINUING", "WORSENING"):
            continuity_note = "Ongoing issue — acknowledge without acting surprised."
        elif status == "IMPROVING":
            continuity_note = "Past problem, distress lower — acknowledge progress."

        state_block = (
            f"[REAL-TIME STATE] Emotion: {emotion} ({intensity:.1f}) | "
            f"Distress: {distress:.1f} | Topic: {primary_concern} | "
            f"Status: {status} | Strategy: {strategy}\n"
            f"{dev_note}"
        )
        if continuity_note:
            state_block += f"\n{continuity_note}"
        if strategy == "GROUND":
            state_block += (
                "\nGROUND: User agreed to an exercise. Generate a dynamic context-specific exercise. "
                "Output a JSON block: <EXERCISE>{\"title\": \"...\", \"description\": \"...\", "
                "\"steps\": [\"step 1\", ...]}</EXERCISE>"
            )
        context_parts.append(state_block)

    if rag_context:
        context_parts.append(f"[KNOWLEDGE — use naturally, do not quote verbatim]\n{rag_context}")

    if compact_context:
        context_parts.append(compact_context)

    # Assemble final user message
    if context_parts:
        user_content = active_prompt + "\n\n─── CONTEXT ───\n" + "\n\n".join(context_parts)
    else:
        user_content = active_prompt

    # ── Assemble API messages ─────────────────────────────────────────────────
    api_messages: list[dict] = [{"role": "system", "content": system}]
    for msg in past_history[-history_limit:] if history_limit > 0 else []:
        api_messages.append({"role": msg["role"], "content": msg["content"]})
    api_messages.append({"role": "user", "content": user_content})

    from providers.llm.router import llm_router
    import re
    
    stream_chunks = []
    buffer = ""
    in_tag = False
    
    try:
        async for chunk in llm_router.stream(
            api_messages=api_messages,
            max_tokens=max_tokens,
            temperature=0.75,
        ):
            if chunk:
                stream_chunks.append(chunk)
                buffer += chunk
                
                while buffer:
                    if not in_tag:
                        idx = buffer.find("<")
                        if idx == -1:
                            yield json.dumps({"type": "chunk", "text": buffer}) + "\n"
                            buffer = ""
                        else:
                            if idx > 0:
                                yield json.dumps({"type": "chunk", "text": buffer[:idx]}) + "\n"
                                buffer = buffer[idx:]
                            
                            if len(buffer) < len("<EXERCISE>"):
                                if "<EXERCISE>".startswith(buffer):
                                    break
                                else:
                                    yield json.dumps({"type": "chunk", "text": buffer[0]}) + "\n"
                                    buffer = buffer[1:]
                            else:
                                if buffer.startswith("<EXERCISE>"):
                                    in_tag = True
                                    buffer = buffer[len("<EXERCISE>"):]
                                else:
                                    yield json.dumps({"type": "chunk", "text": buffer[0]}) + "\n"
                                    buffer = buffer[1:]
                    else:
                        idx = buffer.find("</EXERCISE>")
                        if idx == -1:
                            safe_end = len(buffer)
                            for i in range(1, len("</EXERCISE>")):
                                if buffer.endswith("</EXERCISE>"[:i]):
                                    safe_end = len(buffer) - i
                                    break
                            buffer = buffer[safe_end:]
                            break
                        else:
                            buffer = buffer[idx + len("</EXERCISE>"):]
                            in_tag = False
                            
    except Exception as e:
        print(f"Mythri LLM Router Stream Error: {e}")

    result = "".join(stream_chunks).strip()

    min_length = 8 if memory_usage_mode == "EXPLICIT_RECALL" else 15
    if not result or len(result) < min_length:
        if memory_context and memory_context.strip() and memory_usage_mode == "EXPLICIT_RECALL":
            facts = _extract_facts_from_memory_block(memory_context, active_prompt)
            if facts:
                facts_str = "; ".join(facts)
                result = f"I remember the following about you: {facts_str}."
                yield json.dumps({"type": "chunk", "text": result}) + "\n"
        else:
            result = "I'm listening, go on."
            yield json.dumps({"type": "chunk", "text": result}) + "\n"

    # We send the FULL result (including the EXERCISE tag) in the metadata block so the backend can parse it for metadata
    yield json.dumps({"type": "metadata", "full_text": result}) + "\n"
