import time
from typing import Dict, List, Tuple

class ConcernTracker:
    @staticmethod
    def evaluate_concern_status(
        current_concern_name: str, 
        current_distress: float,
        active_themes: List[Dict]
    ) -> Tuple[str, List[Dict]]:
        """
        Evaluates a current concern against historical themes to determine its status.
        Returns: (status, updated_active_themes)
        Status can be: NEW, CONTINUING, WORSENING, IMPROVING
        """
        if not current_concern_name or current_concern_name == "None" or current_concern_name == "None detected":
            return "NONE", active_themes
            
        status = "NEW"
        matched_theme = None
        matched_index = -1
        
        # Simple string matching MVP (can be upgraded to semantic similarity later)
        normalized_current = current_concern_name.lower().strip()
        
        for idx, theme in enumerate(active_themes):
            normalized_theme = theme.get("name", "").lower().strip()
            if not normalized_theme:
                continue
                
            current_words = set(normalized_current.split())
            theme_words = set(normalized_theme.split())
            
            # Very basic intersection for MVP
            overlap = current_words.intersection(theme_words)
            if len(overlap) > 0 or normalized_current in normalized_theme or normalized_theme in normalized_current:
                matched_theme = theme
                matched_index = idx
                break
                
        if matched_theme:
            historical_distress = matched_theme.get("last_distress", 0.0)
            diff = current_distress - historical_distress
            
            if diff > 0.2:
                status = "WORSENING"
            elif diff < -0.2:
                status = "IMPROVING"
            else:
                status = "CONTINUING"
                
            # Update the theme
            active_themes[matched_index]["last_distress"] = current_distress
            active_themes[matched_index]["last_seen"] = time.time()
            active_themes[matched_index]["occurrence_count"] = matched_theme.get("occurrence_count", 1) + 1
        else:
            # Add new theme
            active_themes.append({
                "name": current_concern_name,
                "first_seen": time.time(),
                "last_seen": time.time(),
                "last_distress": current_distress,
                "occurrence_count": 1
            })
            
        # Keep the 5 most recently seen themes to avoid bloat
        active_themes = sorted(active_themes, key=lambda x: x.get("last_seen", 0), reverse=True)[:5]
            
        return status, active_themes
