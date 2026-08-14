import re

def segment_text(text: str) -> list[str]:
    """
    Intelligently segment a long conversational response into natural message segments.
    Splits primarily by paragraph. Extremely long paragraphs are split by sentence bounds.
    """
    if not text:
        return []
        
    # Split by double newlines or newline (paragraphs)
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
    
    segments = []
    for p in paragraphs:
        if len(p) > 250:
            # simple sentence split keeping the punctuation
            sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', p)
            current_segment = ""
            for s in sentences:
                if len(current_segment) + len(s) < 200:
                    current_segment += (" " if current_segment else "") + s
                else:
                    if current_segment:
                        segments.append(current_segment)
                    current_segment = s
            if current_segment:
                segments.append(current_segment)
        else:
            segments.append(p)
            
    return segments
