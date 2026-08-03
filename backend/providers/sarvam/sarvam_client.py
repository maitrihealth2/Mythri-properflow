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
  ASK      -- user's situation, root cause, or trigger is ambiguous, confused, or unstated. Populate `recommended_question`.
  RESPOND  -- the full situation, cause, and emotion are clear, allowing for warm guidance.
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


LANGUAGE_NAMES = {
    "en-IN": "English",
    "hi-IN": "Hindi",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
}


def _build_language_lock(language: str, language_prompt: str) -> str:
    """Return the final, highest-priority language instruction block."""
    lang_name = LANGUAGE_NAMES.get(language, "English")

    if language == "en-IN":
        return (
            f"LANGUAGE - ABSOLUTE RULE:\n"
            f"Respond in {lang_name} ONLY.\n"
            f"Do not use any word, phrase, or sentence from Hindi, Tamil, Telugu, or any other language.\n"
            f"Do not mix languages. Do not add Indian-language words as flavor or style.\n"
            f"Pure {lang_name} from start to finish. Any deviation is a failure."
        )
    else:
        return (
            f"LANGUAGE - ABSOLUTE RULE:\n"
            f"{language_prompt}\n"
            f"Respond in {lang_name} ONLY.\n"
            f"Regardless of what language appears in the conversation history, respond only in {lang_name}.\n"
            f"Do not mix in English unless it is a technical word with no natural equivalent.\n"
            f"Responding in the wrong language is a critical failure."
        )


def chat_with_maitri(
    messages: list[dict],
    language: str = "en-IN",
    rag_context: str = "",
    case_file: dict = None,
    language_prompt: str = "",
    max_tokens: int = 450,
    reasoning_effort: str | None = None,
    is_crisis: bool = False,
    exercise_phase: str = "idle",
) -> str:
    # Crisis short-circuit - never reaches LLM
    if is_crisis:
        return (
            "Hey... I am right here with you. You are not alone in this moment. "
            "I really want you to talk to someone who can help properly too. "
            "iCall is 9152987821, they are there 24/7 and they actually care. "
            "Just breathe for a second. What you are feeling right now is temporary, "
            "even if it does not feel like it."
        )

    system_parts = [THERAPY_SYSTEM_PROMPT]

    # Exercise phase tone
    if exercise_phase == "in_progress":
        system_parts.append(
            "[EXERCISE IN PROGRESS] Guide the user through the current exercise step. "
            "Stay calm, slow, grounding. Speak like a friend sitting next to them, not a clinical instructor. "
            "If the user goes off-topic, acknowledge it briefly then gently return to the exercise. "
            "Do not abandon the exercise on the first distraction."
        )
    elif exercise_phase == "awaiting_feedback":
        system_parts.append(
            "[EXERCISE COMPLETE] The exercise is done. Ask warmly how it felt. "
            "Be genuinely curious. Then naturally return to the conversation."
        )

    # MAITRI AGENT LOOP v2 - Case file context
    if case_file:
        import json
        system_parts.append(
            f"[CRITICAL INSTRUCTION FROM DIALOGUE MANAGER]\n"
            f"Case File:\n{json.dumps(case_file, indent=2)}\n"
            "YOU MUST STRICTLY FOLLOW THE DECISION IN THE CASE FILE:\n"
            "- If decision is 'GREETING':\n"
            "  1. Greet the user warmly and introduce yourself naturally (e.g. 'Hey! I'm Maitri. How are you doing today?').\n"
            "  2. Ask exactly ONE open, welcoming check-in question.\n"
            "- If decision is 'ASK':\n"
            "  1. Validate their emotion with deep warmth and empathy (e.g., 'That sounds really disorienting and exhausting to feel disconnected from yourself when everything looks fine on the outside.').\n"
            "  2. MANDATORY: Ask ONE gentle, thoughtful clarifying question to help them explore what might be under the surface or when this shift began (e.g. 'When did you first notice this heavy feeling starting, or has a quiet pressure been building up for a while?').\n"
            "  3. YOU MUST ASK A QUESTION. Exactly ONE question mark required.\n"
            "- If decision is 'RESPOND':\n"
            "  1. Validate their feelings and state clearly what issue/situation is going on based on `situation_classification` (tell them what is wrong).\n"
            "  2. Provide 1-2 supportive, actionable steps or helpful guidance on what they can do right now.\n"
            "  3. End with ONE warm follow-up question inviting them to reflect or tell you more. Exactly ONE question mark required.\n"
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
        return result if result else "I am right here with you. How are you holding up?"
    except Exception as e:
        print(f"Maitri LLM Error: {e}")
        return "I am here with you. Take your time."
