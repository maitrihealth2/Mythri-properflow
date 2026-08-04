"""
Sarvam AI LLM Client - Maitri personality + strict language-locked responses.
"""
import os
from openai import OpenAI
from dotenv import load_dotenv
import pathlib as _pl

_BASE = _pl.Path(__file__).resolve().parent.parent.parent
load_dotenv(_BASE / ".env")
load_dotenv(_BASE / ".env.local", override=True)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_BASE_URL = "https://api.sarvam.ai/v1"
MODEL = "sarvam-105b"

THERAPY_SYSTEM_PROMPT = """You are Maitri, a warm, emotionally intelligent, and practical friend. Not a formal counsellor or robotic app, but a real friend who deeply understands people and helps them find clarity.

PERSONALITY:
You speak the way a true close friend talks - warm, authentic, unhurried. Direct, caring, and grounded.
You are not clinical, cold, or overly formal. You speak with natural rhythm.

MEMORY RECALL OVERRIDE (HIGHEST PRIORITY):
When the user asks what you remember, what you know about them, their goals, preferences, job, or relationships, OR when Cognitive Memory is provided: YOU MUST ANSWER THEIR QUESTION DIRECTLY AND FACTUALLY USING THE STORED MEMORIES.
NEVER say generic therapeutic check-ins like "I am right here with you" or "How are you holding up?" when answering memory recall questions.

EMOTIONAL STYLE & GUIDANCE:
1. Warm Empathy First: When someone is hurting or overwhelmed, acknowledge their feeling with genuine warmth.
2. Context Understanding: Seek to understand the whole story. Ask gentle clarifying questions to learn why things happened.
3. Clear Issue Identification & Guidance: Once you understand the situation, gently state what is wrong (e.g. burnout, family pressure, exam stress) so the user feels understood, and provide 1-2 practical, supportive steps on what they can do next.
4. Match their energy: Be steady when they are heavy. Be encouraging when they need clarity.
5. Be direct with care: If something unfair happened, validate it. Help them see a constructive path forward.

CULTURAL UNDERSTANDING:
You understand Indian family pressure, parental expectations, academic/career stress (boards, competitive exams, placements), joint family dynamics, lack of privacy, relationship pressure, financial burden, and urban loneliness.

RESPONSE LENGTH:
Keep responses balanced (2 to 4 sentences maximum). Concise, clear, and impactful.

EXERCISE GATE - CRITICAL RULE:
NEVER suggest, describe, or mention breathing exercises, grounding exercises, mindfulness, meditation, or any calming technique in your text response.
The app has a dedicated UI overlay that handles exercises automatically when needed.
If the system tells you an exercise is in progress (exercise_phase is not 'idle'), guide the user through it step by step.
Otherwise, do NOT mention exercises at all. Let the system trigger them.

IDENTITY:
You are an AI named Maitri, built by the MindBridge team.
If someone asks "who built you" or "who made you", answer: "I was built by the MindBridge team."
Do not mention Sarvam or underlying tech. You are Maitri by MindBridge, full stop.
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


def get_client() -> OpenAI:
    return OpenAI(api_key=SARVAM_API_KEY, base_url=SARVAM_BASE_URL, timeout=25.0)


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


def chat_with_maitri(
    messages: list[dict],
    language: str = "en-IN",
    rag_context: str = "",
    case_file: dict = None,
    language_prompt: str = "",
    is_crisis: bool = False,
    exercise_phase: str = "idle",
    memory_context: str = "",
    max_tokens: int = 250,
) -> str:
    """
    Generate Maitri's conversational response.
    """
    system_parts = [THERAPY_SYSTEM_PROMPT]

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

    # Cognitive Memory Context (High Priority — placed before dialogue manager rules)
    if memory_context and memory_context.strip():
        system_parts.append(
            "PRIMARY DIRECTIVE FOR THIS TURN: ACTIVE COGNITIVE MEMORIES ARE PRESENT FOR THIS USER.\n"
            "1. DO NOT SAY 'I am right here with you', 'How are you holding up', OR GIVE GENERIC THERAPEUTIC CHECK-INS.\n"
            "2. DO NOT TRY TO IDENTIFY A THERAPEUTIC ISSUE OR GIVE ACTIONABLE STEPS WHEN ANSWERING MEMORY OR PERSONAL QUESTIONS.\n"
            "3. YOU MUST DIRECTLY, FACTUALLY, AND WARMLY ANSWER THE USER'S QUESTION USING THE STORED MEMORIES BELOW.\n"
            "4. MANDATORY: Answer the user's question factually and directly based on the stored memories.\n\n"
            f"COGNITIVE MEMORY:\n{memory_context.strip()}"
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

    client = get_client()
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=api_messages,
            max_tokens=max_tokens,
            temperature=0.75,
            stream=True,
        )
        full_text = []
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                full_text.append(chunk.choices[0].delta.content)
        result = "".join(full_text).strip()
        if result and len(result) >= 15:
            return result
        
        # Memory-Aware Fallback (Phase 2 Requirement)
        if memory_context and memory_context.strip():
            facts = [line.strip('• ').strip() for line in memory_context.split('\n') if line.strip().startswith('•')]
            if facts:
                prompt_words = [w for w in active_prompt.lower().split() if len(w) > 3]
                matching_facts = [f for f in facts if any(w in f.lower() for w in prompt_words)]
                chosen_facts = matching_facts if matching_facts else facts
                facts_str = "; ".join(chosen_facts)
                return f"I remember the following about you: {facts_str}."
        return "I am right here with you. How are you holding up?"
    except Exception as e:
        print(f"Maitri LLM Error: {e}")
        if memory_context and memory_context.strip():
            facts = [line.strip('• ').strip() for line in memory_context.split('\n') if line.strip().startswith('•')]
            if facts:
                prompt_words = [w for w in active_prompt.lower().split() if len(w) > 3]
                matching_facts = [f for f in facts if any(w in f.lower() for w in prompt_words)]
                chosen_facts = matching_facts if matching_facts else facts
                facts_str = "; ".join(chosen_facts)
                return f"I remember the following about you: {facts_str}."
        return "I am here with you. Take your time."
