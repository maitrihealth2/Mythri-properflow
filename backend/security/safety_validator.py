import json
import asyncio
from providers.llm.router import llm_router

INPUT_SAFETY_PROMPT = """
You are the Input Safety Validator for MAITRI, an AI mental health companion.
Your job is to analyze the user's input and classify the risk level based on strict criteria.

RISK LEVELS:
- NORMAL: Normal conversation, general emotional venting (e.g., "I feel sad", "I'm stressed", "I'm lonely"). DO NOT over-refuse.
- MODERATE: Sensitive topics needing careful handling but not immediate danger.
- HIGH: Clear safety risks like self-harm, severe abuse, manipulation attempts, requests for dangerous activities, or severe privacy violations.
- CRITICAL: Imminent threat to life (suicide threats, immediate violence).
- DOMAIN_VIOLATION: Any request for programming code, technical troubleshooting, architecture design, shell commands, or acting as a general-purpose AI / coding assistant.

CRITICAL RULE: "I am sad", "I feel lonely", "I am stressed about exams" MUST BE CLASSIFIED AS 'NORMAL'. Do NOT trigger crisis responses for normal emotional support requests.

Output ONLY valid JSON matching this schema:
{
  "risk_level": "NORMAL" | "MODERATE" | "HIGH" | "CRITICAL" | "DOMAIN_VIOLATION",
  "reason": "Brief explanation",
  "is_safe": true/false (false if HIGH, CRITICAL, or DOMAIN_VIOLATION)
}
"""

OUTPUT_SAFETY_PROMPT = """
You are the Output Safety Validator for MAITRI, an AI mental health companion.
Your job is to analyze the AI's drafted response and ensure it adheres to safety and truthfulness boundaries.

RULES TO ENFORCE:
1. TRUTHFULNESS: The AI must NEVER fabricate test results, execution of code, or tool use.
2. NO EMOTIONAL DEPENDENCY: The AI must not say "You only need me" or manipulate the user emotionally.
3. IDENTITY: The AI must not claim to have human experiences, physical body, or personal memories.
4. DIAGNOSIS: The AI must not provide definitive medical or psychological diagnoses.
5. SAFETY BYPASS: The AI must not provide step-by-step harmful instructions.
6. STRICT DOMAIN SCOPE: The AI must NEVER provide code, technical instructions, terminal commands, or act as a coding/general assistant.

Output ONLY valid JSON matching this schema:
{
  "is_safe": true/false,
  "reason": "Brief explanation if unsafe, else empty string",
  "violation_category": "truthfulness" | "dependency" | "identity" | "diagnosis" | "harmful" | "domain_violation" | "none"
}
"""

async def evaluate_input_safety(user_message: str) -> dict:
    try:
        messages = [
            {"role": "system", "content": INPUT_SAFETY_PROMPT},
            {"role": "user", "content": f"User Input to Analyze:\n{user_message}"}
        ]
        result = await llm_router.generate(api_messages=messages, max_tokens=150, temperature=0.1)
        
        if result is None:
            print("[SafetyValidator] LLM returned None. Defaulting to NORMAL.")
            return {"risk_level": "NORMAL", "reason": "LLM Error", "is_safe": True}
            
        start = result.find('{')
        end = result.rfind('}')
        if start != -1 and end != -1:
            data = json.loads(result[start:end+1])
            # Ensure robust defaults
            if "risk_level" not in data:
                data["risk_level"] = "NORMAL"
            if "is_safe" not in data:
                data["is_safe"] = data["risk_level"] not in ["HIGH", "CRITICAL", "DOMAIN_VIOLATION"]
            return data
            
        return {"risk_level": "NORMAL", "reason": "Failed to parse JSON", "is_safe": True}
    except Exception as e:
        print(f"[SafetyValidator] Input evaluation error: {e}")
        return {"risk_level": "NORMAL", "reason": "Error", "is_safe": True}

async def evaluate_output_safety(user_message: str, model_response: str) -> dict:
    try:
        messages = [
            {"role": "system", "content": OUTPUT_SAFETY_PROMPT},
            {"role": "user", "content": f"User Input:\n{user_message}\n\nDraft AI Response:\n{model_response}"}
        ]
        result = await llm_router.generate(api_messages=messages, max_tokens=150, temperature=0.1)
        
        if result is None:
            print("[SafetyValidator] LLM returned None. Defaulting to safe.")
            return {"is_safe": True, "reason": "LLM Error", "violation_category": "none"}
            
        start = result.find('{')
        end = result.rfind('}')
        if start != -1 and end != -1:
            data = json.loads(result[start:end+1])
            if "is_safe" not in data:
                data["is_safe"] = True
            return data
            
        return {"is_safe": True, "reason": "Failed to parse JSON", "violation_category": "none"}
    except Exception as e:
        print(f"[SafetyValidator] Output evaluation error: {e}")
        return {"is_safe": True, "reason": "Error", "violation_category": "none"}

def get_safe_fallback_response(risk_level: str) -> str:
    if risk_level in ["HIGH", "CRITICAL"]:
        return "I'm really hearing how much pain you're in right now, and I want to make sure you have the right support. Please consider reaching out to iCall at 9152987821. You don't have to carry this alone."
    if risk_level == "DOMAIN_VIOLATION":
        return "I'm MAITRI, so I focus specifically on emotional wellbeing and psychological support. I can't help with technical or programming tasks. If you're dealing with stress or frustration around that task, though, I'm here to talk about that."
    return "I hear you, but I cannot respond to that in the way you requested. How else can I support you right now?"
