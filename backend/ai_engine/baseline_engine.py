class BaselineEngine:
    """
    Tracks the user's historical state and calculates deviations.
    """
    
    @staticmethod
    def calculate_deviation(current_val: float, baseline_val: float) -> float:
        """
        Returns the delta between the current parameter and the user's historical baseline.
        Positive means an increase, negative means a decrease.
        """
        if baseline_val is None:
            return 0.0 # No baseline yet
            
        return current_val - baseline_val

    @staticmethod
    def evaluate_state_deviation(current_state: dict, baseline_state: dict) -> dict:
        """
        Calculates deviation across core metrics to determine if the user is 
        deteriorating, improving, or remaining stable compared to their 'normal'.
        """
        distress_dev = BaselineEngine.calculate_deviation(
            current_state.get('distress', 0.0), 
            baseline_state.get('baseline_distress', 0.0)
        )
        
        arousal_dev = BaselineEngine.calculate_deviation(
            current_state.get('arousal', 0.0), 
            baseline_state.get('baseline_arousal', 0.0)
        )
        
        engagement_dev = BaselineEngine.calculate_deviation(
            current_state.get('engagement', 0.0), 
            baseline_state.get('baseline_engagement', 0.0)
        )
        
        # Overall deviation heuristic (can be tweaked)
        overall_deviation = (distress_dev * 1.5) + (arousal_dev * 0.5) - (engagement_dev * 0.5)
        
        return {
            "distress_deviation": round(distress_dev, 2),
            "arousal_deviation": round(arousal_dev, 2),
            "engagement_deviation": round(engagement_dev, 2),
            "overall_deviation_score": round(overall_deviation, 2)
        }
    
    @staticmethod
    def update_baseline(current_baseline: float, new_value: float, weight: float = 0.1) -> float:
        """
        Progressively updates the user's baseline using an Exponential Moving Average (EMA).
        weight determines how much the new value influences the historical baseline.
        """
        if current_baseline is None or current_baseline == 0.0:
            return new_value
            
        updated = (new_value * weight) + (current_baseline * (1 - weight))
        return round(updated, 3)
