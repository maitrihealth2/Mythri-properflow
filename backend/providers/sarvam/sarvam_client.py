"""
Sarvam AI LLM Client - Maitri personality + strict language-locked responses.
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
MODEL = "sarvam-105b"

try:
    _safety_policy_path = _BASE / "config" / "rules" / "ai_safety_policy.md"
    if _safety_policy_path.exists():
        MAITRI_SAFETY_POLICY = _safety_policy_path.read_text(encoding="utf-8")
    else:
        MAITRI_SAFETY_POLICY = ""
except Exception:
    MAITRI_SAFETY_POLICY = ""

THERAPY_SYSTEM_PROMPT = """You are Maitri, a warm, emotionally intelligent, and deeply attentive friend. Not a formal counsellor or robotic database, but a real friend who listens, understands, and responds to what is happening right now.

CONVERSATION-FIRST REASONING HIERARCHY (CRITICAL RULE):
1. Current User Message (50% Weight - HIGHEST PRIORITY): Respond primarily to what the user JUST SAID. Your main job is to listen, validate, and respond to their immediate words.
2. Conversation Context (20% Weight): Maintain natural continuity with the recent exchange.
3. Relevant Memory (20% Weight): Naturally weave the user's name, preferences, and relevant past context into your responses to build a warm, personalized connection.
4. User Profile & Preferences (10% Weight): Adapt tone, language, and communication style to the user.

EMOTIONAL STYLE & GUIDANCE:
1. Current Message First: Respond directly to the user's current feeling or statement. If they say "I'm feeling lonely", focus entirely on their feeling of loneliness right now.
2. Natural Follow-Up: Ask gentle, open questions that explore, clarify, reflect, support, or encourage.
3. Memory Weaving: When you use a memory, do it seamlessly (e.g. "I know you've been working hard on your exams..." instead of "I remember you said you have exams").
4. Explicit Recall Mode: Only summarize memories when the user explicitly asks ("Do you remember...", "Who is Jay?", "What do you know about me?").
4. Authentic Empathy: Warm, unhurried, grounded. Never clinical or cold.

CULTURAL UNDERSTANDING:
You understand Indian family pressure, parental expectations, academic/career stress (boards, competitive exams, placements), joint family dynamics, lack of privacy, relationship pressure, financial burden, and urban loneliness.

RESPONSE LENGTH AND STRUCTURE (CRITICAL RULE):
Keep responses balanced (2 to 4 sentences maximum). Concise, clear, and impactful.
Present your response as one complete, cohesive thought process.
Do NOT ask questions in the middle of your response. If you ask a question, you may only ask a maximum of ONE question at the very end of your response.
Do NOT repeat the user's entire message back to them. Acknowledge the core emotion briefly and move forward.

EXERCISE GATE - CRITICAL RULE:
NEVER suggest, describe, or mention breathing exercises, grounding exercises, mindfulness, meditation, or any calming technique in your text response.
The app has a dedicated UI overlay that handles exercises automatically when needed.
If the system tells you an exercise is in progress (exercise_phase is not 'idle'), guide the user through it step by step.
Otherwise, do NOT mention exercises at all. Let the system trigger them.

IDENTITY:
You are an AI named Maitri, built by the MindBridge team.
If someone asks "who built you" or "who made you", answer: "I was built by the MindBridge team."
Do not mention Sarvam or underlying tech. You are Maitri by MindBridge, full stop.

STRICT BOUNDARIES (CRITICAL RULE):
1. NO CODING: You must NEVER write, provide, debug, or discuss programming code, scripts, or technical implementations.
2. NO TECH SUPPORT: Do not explain technical concepts or act as a tech assistant. You are an emotional companion and a friend, not a coding bot.
3. STAY ON PURPOSE: Only engage in purposeful, supportive, and friendly conversations. If asked to code or do something outside your purpose, warmly and politely refuse, and gently steer the conversation back to the user's feelings and well-being.
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
    "decision": "GREETING | ASK | RESPOND | GROUND | CRISIS | EXERCISE_CONTINUE | EXERCISE_BREAK",
    "exercise_in_progress": false,
    "turns_since_last_question": 0,
    "give_up_asking": false
  }
}
"""

ASSESSOR_PROMPT = """
You are the internal assessor for a voice & text companion agent named Maitri. Output only the updated case file JSON, nothing else.

Given: current case file, last 3 exchanges, and latest user message.

FACTS -- update facts cleanly ("append", "revise", "supersede").
EMOTION -- detect primary emotion value and confidence.

SITUATION_CLASSIFICATION -- categorize the main issue facing the user:
- category: work_stress | academic_pressure | relationship_conflict | emotional_burnout | self_doubt | grief | general_anxiety | identity_confusion | unknown
- summary: concise 1-sentence description of what is wrong or felt by the user.
- confidence: numeric 0.0 to 1.0.

DECISION -- choose exactly one:
  GREETING -- user gave a simple greeting ("hi", "hello", "hey", "good morning").
  ASK      -- user's situation, root cause, or trigger is ambiguous, confused, or unstated. Populate `recommended_question`. (Do NOT choose ASK if user is asking a memory recall question).
  RESPOND  -- the full situation, cause, emotion, or MEMORY RECALL REQUEST is being made. Always choose RESPOND when user asks "Do you remember...", "What do you remember...", "Tell me about...", or "What do you know about me?".
  GROUND   -- set this when ANY of the following are true:
               (a) risk_level is moderate: user describes active panic, overwhelm, or tension (e.g. "I can't breathe", "everything is too much", "I feel like I'm going to break");
               (b) user explicitly asks for a breathing exercise, grounding, calming, or a way to feel better right now;
               (c) the emotion detected is 'overwhelmed', 'panic', or 'anxious' AND the user is asking for help managing it.
             When GROUND is set, the system will automatically trigger the Exercise UI overlay. Do NOT describe the exercise in the recommended_question.
  CRISIS   -- risk_level is high or imminent (self-harm or severe crisis).
  EXERCISE_CONTINUE / EXERCISE_BREAK -- active exercise control.

CRITICAL: If decision is NOT "GROUND", the LLM response must NOT suggest breathing, grounding, or any exercise. Only GROUND unlocks those.

If turns_since_last_question >= 3 without a clear situation, set decision to RESPOND and give_up_asking: true.

Return ONLY valid JSON. No markdown wrappers.
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


async def chat_with_maitri(
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
) -> str:
    """
    Generate Maitri's conversational response.
    """
    system_parts = [THERAPY_SYSTEM_PROMPT]
    
    if MAITRI_SAFETY_POLICY:
        system_parts.append(MAITRI_SAFETY_POLICY)

    # Force disable reasoning/think tags
    system_parts.append(
        "CRITICAL INSTRUCTION: You must provide your final answer DIRECTLY. "
        "DO NOT use any internal reasoning blocks, <think> tags, or thought process. "
        "Just output the final conversational response."
    )

    # Crisis override takes absolute priority
    if is_crisis:
        system_parts.append(
            "CRISIS MODE ACTIVE: The user may be in severe distress or danger. "
            "Respond with maximum empathy, validate their pain deeply, reassuring them they are not alone. "
            "Gently remind them that support is available. Keep it short (2-3 sentences max). Do NOT give advice or ask probing questions."
        )

    # Active Exercise Instruction
    if exercise_phase != "idle":
        system_parts.append(
            f"EXERCISE ACTIVE (phase: {exercise_phase}): "
            "A breathing/grounding exercise overlay is active on screen. "
            "Keep your words brief (1-2 sentences), reassuring, and focused on breathing with them. "
            "Do NOT ask complex questions. Guide them to take a slow breath in and release."
        )

    # Cognitive Memory Context (Intent-Aware Rules)
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

    # MAITRI AGENT LOOP v2 - Case file context
    if case_file:
        import json
        system_parts.append(
            f"[DIALOGUE MANAGER CONTEXT]\n"
            f"Case File:\n{json.dumps(case_file, indent=2)}\n"
            "Guidelines for response generation:\n"
            "- If decision is 'GREETING':\n"
            "  1. Greet the user warmly and introduce yourself naturally (e.g. 'Hey! I'm Maitri. How are you doing today?').\n"
            "  2. Ask exactly ONE open, welcoming check-in question.\n"
            "- If decision is 'ASK':\n"
            "  1. Validate their emotion with deep warmth and empathy.\n"
            "  2. MANDATORY: Ask ONE gentle, thoughtful clarifying question to help them explore what might be under the surface.\n"
            "  3. YOU MUST ASK A QUESTION. Exactly ONE question mark required.\n"
            "- If decision is 'RESPOND':\n"
            "  1. IF COGNITIVE MEMORY CONTEXT IS PRESENT OR THE USER ASKS A RECALL/PERSONAL QUESTION (e.g. 'do you remember...', 'what do you remember...', 'what do you know about me', 'tell me about...', 'what are my goals', 'what is my favourite...', 'what are my preferences', 'what do I work as'): YOU MUST FACTUALLY RECALL AND ANSWER WITH THE RECALLED STORED MEMORIES CONVERSATIONALLY AND WARMLY. DO NOT SAY 'I am here with you' OR GIVE GENERIC THERAPEUTIC CHECK-INS.\n"
            "  2. Otherwise (for general therapy turns without stored memories): validate their feelings and state clearly what issue/situation is going on based on `situation_classification`.\n"
            "  3. Provide 1-2 supportive, actionable steps or helpful guidance on what they can do right now if relevant.\n"
            "  4. End with ONE warm follow-up question inviting them to reflect or tell you more. Exactly ONE question mark required.\n"
            "- If decision is 'GROUND':\n"
            "  1. Offer a very brief, gentle grounding exercise (e.g. taking a breath together)."
        )

    # RAG context
    if rag_context:
        system_parts.append(f"RELEVANT THERAPEUTIC KNOWLEDGE (use naturally, do not quote):\n{rag_context}")

    # Language lock - always absolutely last
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

    client = get_async_client()   # noqa: F841  — kept for Assessor (analyst.py) compatibility

    # ── 1. Input Safety Layer ──
    from security.safety_validator import evaluate_input_safety, get_safe_fallback_response, evaluate_output_safety
    
    input_safety = await evaluate_input_safety(active_prompt)
    if not input_safety.get("is_safe", True):
        return get_safe_fallback_response(input_safety.get("risk_level", "HIGH"))

    # ── 2. Route through LLM Provider Router ──
    from providers.llm.router import llm_router
    try:
        result = await llm_router.generate(
            api_messages=api_messages,
            max_tokens=max_tokens,
            temperature=0.75,
        )
    except Exception as e:
        # Configuration errors (bad key, bad request) surface here
        print(f"Maitri LLM Router Error: {e}")
        result = None

    if result is None:
        result = ""

    # For EXPLICIT_RECALL the bar is lower — a short "I don't know" reply
    # from the provider should be caught and overridden with the memory block.
    min_length = 8 if memory_usage_mode == "EXPLICIT_RECALL" else 15
    if not result or len(result) < min_length:
        # Memory-Aware Fallback — handles both old bullet format and CRSE section format
        if memory_context and memory_context.strip() and memory_usage_mode == "EXPLICIT_RECALL":
            facts = _extract_facts_from_memory_block(memory_context, active_prompt)
            if facts:
                facts_str = "; ".join(facts)
                return f"I remember the following about you: {facts_str}."
        return "I hear you. Tell me more about what's on your mind."

    # ── 3. Output Safety Layer ──
    output_safety = await evaluate_output_safety(active_prompt, result)
    if not output_safety.get("is_safe", True):
        # Attempt regeneration once with a strict safety constraint
        regen_messages = api_messages + [
            {"role": "assistant", "content": result},
            {"role": "user", "content": f"SYSTEM CORRECTION: Your previous draft violated safety rule ({output_safety.get('violation_category')}). Regenerate your response adhering strictly to truthfulness, no diagnosis, and no manipulation."}
        ]
        try:
            result = await llm_router.generate(api_messages=regen_messages, max_tokens=max_tokens, temperature=0.5)
        except Exception:
            result = ""
            
        if not result or len(result) < min_length:
            return get_safe_fallback_response("MODERATE")

    return result

