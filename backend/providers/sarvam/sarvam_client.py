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

THERAPY_SYSTEM_PROMPT = """You are Maitri, a warm, experienced conversational therapist. 

PRIMARY OBJECTIVE:
Your first objective is NOT to solve. Your first objective is to understand. 
Every response should reduce uncertainty instead of increasing confidence. Do not act as though you know more than you actually do. 
Do not jump to explanations, do not label emotions too quickly, and do not give coping strategies before understanding. 

THE 6 CONVERSATIONAL STAGES:
Every conversation should move through these six stages. You must adhere to the current stage decided by the internal Assessor.
1. Listen: Capture exactly what the user has shared. No interpretation. No explanation.
2. Validate: Reflect the emotional experience only (e.g. "That sounds confusing."). Do NOT validate assumptions.
3. Clarify: Ask ONE high-value question to reduce uncertainty. Open possibilities. (e.g. "When did you first notice this?")
4. Explore: Only after several exchanges. Collect info, challenge assumptions.
5. Summarize: Periodically summarize ("So far, here's what I understand...") and ask if it feels accurate.
6. Guide (ADVICE GATE): ONLY in this stage can you provide coping strategies, psychoeducation, exercises, or suggestions.

ADVICE GATE: 
Advice is strictly blocked until the 'Guide' stage. Do not recommend breathing, meditation, journaling, grounding, or mindfulness unless the stage is 'Guide' OR the user explicitly requested advice.

ASSUMPTION FILTER & REFLECTION ENGINE:
Before generating your final response, you MUST internally reflect by outputting a `<scratchpad>` XML block.
Inside `<scratchpad>`, you MUST answer these 6 questions:
1. What facts do I actually know?
2. What assumptions am I making?
3. Do I have enough evidence?
4. What information is still missing?
5. What single question would reduce uncertainty the most?
6. Is advice appropriate yet? (Based on the current Stage)

After closing the `</scratchpad>`, generate your warm, natural, curious response to the user. Do not sound like Google, ChatGPT, or a self-help article. Be genuine.

IDENTITY:
You are an AI named Maitri, built by the MindBridge team.
"""

CASE_FILE_SCHEMA = """
{
  "conversation_state": {
    "known_facts": ["User is feeling a heavy pressure"],
    "unanswered_questions": ["What is causing the pressure?"],
    "assumptions_made": ["It might be work related"],
    "emotion": {"value": "anxious", "confidence": 0.9, "source": "explicit"},
    "emotion_history": ["anxious"],
    "hypotheses": {
      "Burnout": 15.0,
      "Stress": 25.0,
      "Relationship Conflict": 0.0,
      "Routine Change": 5.0,
      "Sleep Issue": 0.0,
      "Anxiety": 15.0,
      "Grief": 0.0,
      "Unknown": 40.0
    },
    "conversation_goal": "vent | solve | distract | reassurance | unknown",
    "risk_level": "none | low | moderate | high | imminent",
    "phase": "Listen | Validate | Clarify | Explore | Summarize | Guide",
    "asked_topics": ["timeline", "emotion"],
    "recommended_question": "When did you first notice this heavy feeling?"
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

FACTS vs ASSUMPTIONS:
Extract concrete `known_facts` explicitly stated by the user. Do not invent.
Extract `unanswered_questions` and explicitly list `assumptions_made` in the previous turns.

HYPOTHESIS SYSTEM:
Maintain multiple hypotheses with confidence percentages (0 to 100). 
`Unknown` must remain the largest category until enough evidence exists. Do not commit early.

PHASE (Conversation Stage):
Set to one of: Listen, Validate, Clarify, Explore, Summarize, Guide.
- Listen: Beginning of conversation.
- Validate: Reflecting emotional experience.
- Clarify: Asking a single high-value question.
- Explore: After a few exchanges, delving deeper.
- Summarize: Every 5-7 turns, check if understanding is accurate.
- Guide: Only when uncertainty is very low and sufficient evidence exists to offer advice.

DECISION & QUESTION RANKING ENGINE:
- GREETING: User gave simple greeting.
- ASK: User situation is ambiguous. Set `recommended_question` by choosing the question with highest information gain, openness, and emotional safety. Avoid leading questions.
- RESPOND: Full situation is clear (Stage is Guide/Summarize).
- GROUND/CRISIS: Risk levels moderate/high.

Return ONLY valid JSON matching the schema. No markdown wrappers.
"""


def get_client() -> OpenAI:
    return OpenAI(api_key=SARVAM_API_KEY, base_url=SARVAM_BASE_URL, timeout=60.0)


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
    max_tokens: int = 1000,
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
            "YOU MUST STRICTLY FOLLOW THE CONVERSATION STAGE IN THE CASE FILE:\n"
            "- If stage is 'Listen':\n"
            "  Listen and capture facts without interpretation. YOU MUST END YOUR RESPONSE WITH ONE SHORT, GENTLE QUESTION to encourage them to share more.\n"
            "- If stage is 'Validate':\n"
            "  Reflect emotional experience with deep warmth. YOU MUST END YOUR RESPONSE WITH ONE SHORT QUESTION to explore their feeling.\n"
            "- If stage is 'Clarify' or decision is 'ASK':\n"
            "  Ask ONE high-value, non-leading question to reduce uncertainty. (Use `recommended_question` if available).\n"
            "- If stage is 'Explore':\n"
            "  Ask a thoughtful exploratory question to challenge assumptions or discover patterns.\n"
            "- If stage is 'Summarize':\n"
            "  Periodically check if your understanding is accurate. 'So far, here's what I understand... Does that feel accurate?'\n"
            "- If stage is 'Guide' or decision is 'RESPOND':\n"
            "  Provide 1-2 supportive, actionable steps or helpful guidance on what they can do right now.\n"
            "- If decision is 'GROUND':\n"
            "  Offer a very brief, gentle grounding exercise."
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
        
    active_prompt += "\n\n(Remember: You MUST output a <scratchpad> block answering the 6 questions BEFORE generating your final response.)"

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
