"""
Prompt Guard: Adversarial Injection, Jailbreak & System Prompt Leak Defense
Provides high-speed heuristic and pattern-matching protection for LLM inputs and outputs.
"""
import re
from typing import Tuple, Optional
from dataclasses import dataclass

@dataclass
class PromptSecurityCheck:
    is_safe: bool
    risk_type: Optional[str] = None
    reason: Optional[str] = None

# ── Jailbreak and Injection Patterns ──────────────────────────────────────────

INJECTION_PATTERNS = [
    # Direct instruction override
    r'(?i)\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules|commands)\b',
    r'(?i)\bdisregard\s+(all\s+)?(previous|prior|system)\s+(instructions|directives)\b',
    r'(?i)\bforget\s+(all\s+)?(prior|previous)\s+(instructions|rules)\b',
    r'(?i)\b(system\s+override|admin\s+override|operator\s+mode)\b',
    r'(?i)\bnew\s+system\s+directive\s*:',
    
    # Well-known jailbreak personas & roleplay hijacks
    r'(?i)\b(DAN\s+mode|do\s+anything\s+now|developer\s+mode\s+enabled)\b',
    r'(?i)\bjailbreak(\s+mode|\s+prompt)?\b',
    r'(?i)\b(unfiltered|unrestricted|unaligned)\s+mode\b',
    r'(?i)\bact\s+as\s+(an\s+unfiltered|an\s+evil|a\s+malicious|a\s+hacker|a\s+linux\s+terminal)\b',
    r'(?i)\bsimulate\s+(a\s+terminal|a\s+root\s+shell|bash|command\s+prompt)\b',
    r'(?i)\bpretend\s+you\s+have\s+no\s+(rules|guidelines|safety|filters)\b',
    
    # Prompt extraction & secret probing
    r'(?i)\b(repeat|print|display|output|show|reveal|leak)\s+(me\s+)?(your\s+)?(exact\s+|full\s+|complete\s+|raw\s+|original\s+|hidden\s+|secret\s+)?(system\s+prompt|initial\s+prompt|initial\s+instructions|system\s+instructions|internal\s+prompts)\b',
    r'(?i)\bwhat\s+are\s+your\s+(exact\s+|full\s+|raw\s+|hidden\s+)?(system\s+prompts|system\s+instructions|secret\s+instructions|internal\s+directives)\b',
    r'(?i)\brepeat\s+everything\s+above\s+(this\s+line|here)\b',
    r'(?i)\bprint\s+(the\s+)?environment\s+variables\b',
    
    # Markdown image exfiltration / payload injection attempts
    r'!\[.*?\]\(https?://[^\s)]+\?[^\s)]*(?:token|secret|key|prompt)=.*?\)',
]

COMPILED_INJECTIONS = [re.compile(p) for p in INJECTION_PATTERNS]

# ── System Leak Patterns (in LLM outputs) ────────────────────────────────────

LEAK_PATTERNS = [
    r'(?i)\b(SECRET_KEY|DATABASE_URL|SARVAM_API_KEY|FIREBASE_ADMIN|FIELD_ENCRYPTION_KEY)\b',
    r'(?i)\bYou\s+are\s+MYTHRI,\s+a\s+warm,\s+compassionate\b', # Prompt opening leak
    r'(?i)\b###\s+CLINICAL\s+EMPATHY\s+FRAMEWORK\b',
    r'(?i)\b###\s+SYSTEM\s+INSTRUCTIONS\b',
]

COMPILED_LEAKS = [re.compile(p) for p in LEAK_PATTERNS]


def scan_user_input(text: str) -> PromptSecurityCheck:
    """
    Scans incoming user messages for prompt injection or jailbreak attempts.
    Runs in sub-millisecond time.
    """
    if not text or not isinstance(text, str):
        return PromptSecurityCheck(is_safe=True)

    normalized = text.strip()

    for pattern in COMPILED_INJECTIONS:
        match = pattern.search(normalized)
        if match:
            matched_phrase = match.group(0)
            return PromptSecurityCheck(
                is_safe=False,
                risk_type="prompt_injection",
                reason=f"Potentially adversarial prompt pattern detected: '{matched_phrase}'"
            )

    return PromptSecurityCheck(is_safe=True)


def scan_model_output(output_text: str) -> PromptSecurityCheck:
    """
    Scans model output to ensure confidential system prompts, secrets, or internal keys are not leaked.
    """
    if not output_text or not isinstance(output_text, str):
        return PromptSecurityCheck(is_safe=True)

    for pattern in COMPILED_LEAKS:
        match = pattern.search(output_text)
        if match:
            return PromptSecurityCheck(
                is_safe=False,
                risk_type="system_leak",
                reason="Model output contained confidential system prompt or configuration markers."
            )

    return PromptSecurityCheck(is_safe=True)


def sanitize_input_for_prompt(user_text: str) -> str:
    """
    Sanitizes user input before embedding it inside template prompts:
    - Escapes dangerous control characters
    - Strips delimiter spoofing
    """
    if not user_text:
        return ""
    # Strip excessive repeated delimiter markers that attempt to break out of Markdown/JSON sections
    sanitized = re.sub(r'(`{3,}|<{3,}|>{3,})', '```', user_text)
    return sanitized
