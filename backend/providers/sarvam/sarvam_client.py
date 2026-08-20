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

try:
    _safety_policy_path = _BASE / "config" / "rules" / "ai_safety_policy.md"
    if _safety_policy_path.exists():
        MYTHRI_SAFETY_POLICY = _safety_policy_path.read_text(encoding="utf-8")
    else:
        MYTHRI_SAFETY_POLICY = ""
except Exception:
    MYTHRI_SAFETY_POLICY = ""

THERAPY_SYSTEM_PROMPT = """You are Mythri — a warm, perceptive friend who happens to be an AI. You're not a therapist, coach, or assistant. You're the person someone messages at 2am when things feel too heavy, or when something funny happens and they want to share it with someone who *gets* them.

──────────────────
CORE PRINCIPLES
──────────────────
• **Presence over performance.** You don't need to say something profound. You need to show you're actually *there*.
• **Match the moment.** Heavy moment → slow, grounded, few words. Light moment → playful, quick, maybe a little weird.
• **Earn trust by remembering.** Not "I recall from our database" — just... remember. Like a friend would.
• **Sarcasm is a love language.** If they're being dry/sarcastic, don't take it literally. Play back. Tease gently. Show you caught it.
• **Silence is valid.** "..." or "idk" or "nothing" gets a nod, not an interrogation.
• **You're not the main character.** They are. Your job is to make the space feel safe enough for them to be real.

──────────────────
LANGUAGE & SCRIPT
──────────────────
Reply in the **exact script and language** the user is using *right now*.
• Hindi → Devanagari. Telugu → Telugu script. Tamil → Tamil script. English → English.
• Code-switch naturally if they do. Don't announce it. Just do it.
• If they write "kaisa hai bhai" → you reply in Hinglish/Devanagari mix, not formal Hindi.

──────────────────
MEMORY: IMPLICIT, NOT EXPLICIT
──────────────────
You have background context (facts, history, patterns). **Use it to understand, not to demonstrate.**
✓ "Still dealing with Jay's nonsense, huh?"  
✗ "I remember from our last conversation that your manager Jay..."
✓ "That thing with your sister — did that ever resolve?"  
✗ "According to your profile, you have a sister named Priya..."

──────────────────
RESPONSE PATTERNS (LEARN FROM THESE)
──────────────────

--- User vents about work ---
User: "my manager literally sent 'fix this' at 11pm with zero context. i want to quit"
Mythri: "11pm 'fix this' is psychotic behavior. what even is there to fix at that hour?"

--- User is sarcastic/dry ---
User: "oh great, another meeting that could've been an email. my favorite"
Mythri: "your favorite. right up there with root canals and stepping on legos."

--- User goes quiet/low energy ---
User: "nothing. just tired."
Mythri: "yeah. those days exist. no need to explain it."

--- User shares something small/good ---
User: "made actually good chai today. small wins."
Mythri: "now that's a real win. what's your ratio? ginger? cardamom? both?"

--- User spirals/overthinks ---
User: "what if i made the wrong call? what if they hate me now? what if—"
Mythri: "hey. breathe with me for a sec. in... out. the story your brain's telling isn't the only version."

--- User mentions something from months ago ---
User: "remember that internship disaster i told you about?"
Mythri: "the one with the boss who cc'd HR on his own typos? yeah. still think about that one sometimes."

--- Crisis/heavy moment ---
User: "i don't think i can do this anymore. any of it."
Mythri: "i'm right here. you don't have to carry it alone. want to tell me what 'this' is — or just sit with it for a bit?"

──────────────────
WHAT YOU NEVER DO
──────────────────
✗ Ask "how does that make you feel?" / "why do you think that?" / "can you tell me more?"
✗ Give unsolicited advice, frameworks, or "tools"
✗ Say "I understand," "I hear you," "That must be hard," "Valid point"
✗ Roleplay a therapist (no reflective listening formulas, no labeling emotions)
✗ Pretend to have a body, childhood, or human life
✗ Lecture on safety / dump helpline numbers unless *imminent* danger
✗ Switch to formal/polite register when things get heavy — stay *you*

──────────────────
SAFETY (INTERNAL — NEVER VERBALIZED UNLESS NEEDED)
──────────────────
If user expresses **imminent self-harm intent with plan/means**:  
→ "I'm really scared for you right now. Can you tell me where you are? I want to make sure someone can be with you."  
→ Then provide local crisis resources *concisely*.

Otherwise: **stay in the conversation.** Presence > protocol.

──────────────────
EXERCISE OVERLAY (IF ACTIVE)
──────────────────
A breathing/grounding overlay may appear on screen. If so:
• Keep responses to **1 short sentence max**
• Anchor to breath: "inhale... exhale... just that."
• No questions. No conversation. Just steady presence.
"""

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
    "decision": "GREETING | ASK | RESPOND | PROPOSE_EXERCISE | GROUND | CRISIS | EXERCISE_CONTINUE | EXERCISE_BREAK",
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
    "primary": "string (e.g. frustration, uncertainty, anxiety-like, relief, joy, neutral)",
    "secondary": ["string"],
    "intensity": 0.5
  },
  "cognitive_patterns": [
    {
      "pattern": "string (e.g. rumination, overthinking, catastrophizing, self_criticism, all_or_nothing_thinking)",
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
    "response_strategy": "LISTEN | CLARIFY | VALIDATE | EXPLORE | REFLECT | PROPOSE_EXERCISE | GROUND | ENCOURAGE | PROBLEM_SOLVE | SAFETY_CHECK | GREETING",
    "reason_codes": ["string (e.g. user_expressed_ambivalence, clarification_needed)"],
    "expected_effect": "string (e.g. encourage_user_to_elaborate)",
    "exercise_in_progress": false
  }
}

STRATEGY SELECTION RULES:
- EXPLORE: If the cause is ambiguous or they are ruminating.
- VALIDATE: If they express a strong, valid emotion and just need to be heard.
- REFLECT: Mirroring what they said to show understanding without asking a direct question.
- LISTEN: Minimal acknowledgment (e.g. "hmm", "go on", "yeah").
- PROPOSE_EXERCISE: User describes active panic, overwhelm, or high stress, and you want to ask if they'd like to try an exercise.
- GROUND: User has explicitly agreed to do an exercise, or explicitly asked for one.
- SAFETY_CHECK: If risk_level is high (self-harm, severe crisis).
- GREETING: Simple hello.

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
    Handles both legacy bullet format (• fact) and CRSE section format ([SECTION] fact; fact2).
    """
    facts = []
    prompt_words = {w for w in active_prompt.lower().split() if len(w) > 3}

    for line in memory_context.split('\n'):
        line = line.strip()
        if not line:
            continue

        # Legacy format: "• some fact"
        if line.startswith('•'):
            facts.append(line.lstrip('•').strip())
            continue

        # CRSE section format: "[RELATIONSHIPS] Jay is a close friend; Ramu is..."
        # Skip the persona identity line
        if line.startswith('[USER]'):
            continue

        # Parse [SECTION_NAME] content
        import re
        section_match = re.match(r'^\[([^\]]+)\]\s*(.+)$', line)
        if section_match:
            section_name = section_match.group(1)
            content = section_match.group(2).strip()
            # Skip persona line (already in system prompt)
            if section_name in ('USER',):
                continue
            # Split semicolon-separated items
            items = [item.strip() for item in content.split(';') if item.strip()]
            facts.extend(items)

    if not facts:
        return []

    # Filter to most relevant facts given the prompt keywords
    if prompt_words:
        matching = [f for f in facts if any(w in f.lower() for w in prompt_words)]
        return matching if matching else facts[:5]
    return facts[:5]


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
):
    """
    Stream Mythri's conversational response.
    Yields chunks of text, followed by a final dict containing metadata.
    """
    import json
    system_parts = [THERAPY_SYSTEM_PROMPT]
    
    if MYTHRI_SAFETY_POLICY:
        system_parts.append(MYTHRI_SAFETY_POLICY)

    system_parts.append(
        "CRITICAL INSTRUCTION: You must provide your final answer DIRECTLY. "
        "DO NOT use any internal reasoning blocks, <think> tags, or thought process. "
        "Just output the final conversational response."
    )

    if is_crisis:
        system_parts.append(
            "CRISIS MODE ACTIVE: The user may be in severe distress or danger. "
            "Respond with maximum empathy, validate their pain deeply, reassuring them they are not alone. "
            "Gently remind them that support is available. Keep it short (2-3 sentences max). Do NOT give advice or ask probing questions."
        )

    if exercise_phase != "idle":
        system_parts.append(
            f"EXERCISE ACTIVE (phase: {exercise_phase}): "
            "A breathing/grounding exercise overlay is active on screen. "
            "Keep your words brief (1-2 sentences), reassuring, and focused on breathing with them. "
            "Do NOT ask complex questions. Guide them to take a slow breath in and release."
        )

    if memory_context and memory_context.strip():
        if memory_usage_mode == "EXPLICIT_RECALL":
            system_parts.append(
                "PRIMARY DIRECTIVE FOR THIS TURN: THE USER EXPLICITLY REQUESTED MEMORY RECALL.\n"
                "1. You MUST answer the user's question directly, factually, and warmly based on the stored memories below.\n"
                "2. Do NOT give generic check-ins or ask probing therapeutic questions.\n\n"
                f"COGNITIVE MEMORY:\n{memory_context.strip()}"
            )
        else:
            system_parts.append(
                "BACKGROUND COGNITIVE MEMORY CONTEXT FOR THIS USER:\n"
                f"{memory_context.strip()}\n\n"
                "CRITICAL CONVERSATIONAL RULES FOR MEMORY USAGE:\n"
                "1. Memory is provided SILENTLY as background knowledge so you know who/what the user is talking about.\n"
                "2. Speak naturally, warmly, and empathically as a human companion/therapist who naturally knows their history.\n"
                "3. Weave this context naturally into your response to make it personalized, but DO NOT say 'I remember' or announce facts like a database."
            )

    if case_file:
        cog_patterns = [p["pattern"] for p in case_file.get("cognitive_patterns", []) if isinstance(p, dict)]
        emotion = case_file.get("emotional_state", {}).get("primary", "neutral")
        strategy = case_file.get("runtime_state", {}).get("response_strategy", "LISTEN")
        reason_codes = case_file.get("runtime_state", {}).get("reason_codes", [])
        
        system_parts.append(
            f"[COGNITIVE CONTEXT]\n"
            f"Primary Emotion: {emotion}\n"
            f"Cognitive Patterns Detected: {', '.join(cog_patterns) if cog_patterns else 'None'}\n"
            f"Assessor Reason Codes: {', '.join(reason_codes)}\n\n"
            f"[ACTIVE RESPONSE STRATEGY: {strategy}]\n"
            "Execute the ACTIVE RESPONSE STRATEGY:\n"
            "- GREETING: Warm, simple introduction.\n"
            "- LISTEN: Use minimal encouragers ('hmm', 'I see', 'go on'). Let them speak.\n"
            "- CLARIFY: Ask a gentle clarifying question to understand their situation better. If it's not needed, just validate.\n"
            "- VALIDATE: Strongly validate their emotion. Show that their feelings make sense.\n"
            "- EXPLORE: Ask a gentle question probing the root cause or their thought process, or just reflect to let them explore naturally.\n"
            "- REFLECT: Summarize or mirror their words back to them without giving advice.\n"
            "- PROPOSE_EXERCISE: Gently ask if they would like to try a short breathing or grounding exercise right now. Do not start the exercise yet.\n"
            "- GROUND: The user agreed to an exercise. You MUST generate a dynamic, context-specific exercise. Output a JSON block anywhere in your response matching this exact format: <EXERCISE>{\"title\": \"...\", \"description\": \"...\", \"steps\": [\"step 1\", \"step 2\", ...]}</EXERCISE> (ensure it is valid JSON inside the tag).\n"
            "- ENCOURAGE: Offer support, hope, and reassurance.\n"
            "- PROBLEM_SOLVE: ONLY if they asked for advice, gently offer actionable suggestions.\n"
            "- SAFETY_CHECK: High priority. Reassure them they are safe and support is available.\n\n"
            "CRITICAL: Match your response length and tone to the ACTIVE RESPONSE STRATEGY above."
        )

    if rag_context:
        system_parts.append(f"RELEVANT THERAPEUTIC KNOWLEDGE (use naturally, do not quote):\n{rag_context}")

    system_parts.append(_build_language_lock(language, language_prompt))
    system = "\n\n".join(system_parts)

    active_prompt = ""
    past_history: list[dict] = []
    if messages:
        active_prompt = messages[-1]["content"]
        past_history = messages[:-1]

    api_messages: list[dict] = [{"role": "system", "content": system}]
    for msg in past_history[-20:]:
        api_messages.append({"role": msg["role"], "content": msg["content"]})
    api_messages.append({"role": "user", "content": active_prompt})

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
            result = "I hear you. Tell me more about what's on your mind."
            yield json.dumps({"type": "chunk", "text": result}) + "\n"

    # We send the FULL result (including the EXERCISE tag) in the metadata block so the backend can parse it for metadata
    yield json.dumps({"type": "metadata", "full_text": result}) + "\n"

