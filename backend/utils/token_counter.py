"""
Token Counter Utility
Provides accurate token calculation using tiktoken (cl100k_base) with fast heuristic fallbacks.
"""
from typing import List, Dict, Any

_encoder = None

def _get_encoder():
    global _encoder
    if _encoder is None:
        try:
            import tiktoken
            _encoder = tiktoken.get_encoding("cl100k_base")
        except Exception:
            _encoder = None
    return _encoder

def count_tokens(text: str) -> int:
    """Calculates token count for a text string."""
    if not text:
        return 0
    enc = _get_encoder()
    if enc is not None:
        try:
            return len(enc.encode(text, disallowed_special=()))
        except Exception:
            pass
    # Fast fallback: ~4 characters per token average
    return max(1, len(text) // 4)

def count_messages_tokens(messages: List[Dict[str, Any]]) -> int:
    """
    Calculates token count for a list of chat completion messages.
    Includes message formatting overhead (~3-4 tokens per message).
    """
    if not messages:
        return 0
    
    total_tokens = 0
    enc = _get_encoder()
    
    for msg in messages:
        # Every message follows <|start|>{role/name}\n{content}<|end|>\n
        total_tokens += 4
        content = msg.get("content", "")
        role = msg.get("role", "")
        
        if enc is not None:
            try:
                total_tokens += len(enc.encode(str(content), disallowed_special=()))
                total_tokens += len(enc.encode(str(role), disallowed_special=()))
            except Exception:
                total_tokens += count_tokens(str(content)) + count_tokens(str(role))
        else:
            total_tokens += count_tokens(str(content)) + count_tokens(str(role))
            
    total_tokens += 3  # every reply is primed with <|start|>assistant<|message|>
    return total_tokens
