from typing import List
from pydantic import BaseModel, Field

class Concern(BaseModel):
    name: str
    intensity: float
    distress: float
    sensitivity: float
    recurrence: float = Field(description="Has this happened before? 1.0 for highly recurring, 0.5 for new")
    relevance: float = Field(description="How relevant is this to the CURRENT conversation context")
    risk: float

class RankedConcern(BaseModel):
    concern: Concern
    priority_score: float

class RankingAlgorithm:
    """
    Ranks multiple concerns found in a single user message.
    Formula: Priority = Intensity * Distress * Sensitivity * Recurrence * Relevance * Risk
    """
    
    @staticmethod
    def calculate_priority(concern: Concern) -> float:
        # Base multiplier logic. Risk acts as a heavy multiplier if non-zero.
        # We ensure a minimum risk multiplier of 1.0 so low risk doesn't zero out everything else.
        risk_multiplier = max(1.0, concern.risk * 5)
        
        score = (
            concern.intensity * 
            concern.distress * 
            concern.sensitivity * 
            concern.recurrence * 
            concern.relevance * 
            risk_multiplier
        )
        return round(score, 3)

    @staticmethod
    def rank_concerns(concerns: List[Concern]) -> dict:
        """
        Takes a list of concerns and sorts them into Primary, Secondary, and Associated.
        """
        if not concerns:
            return {}
            
        ranked_list = []
        for c in concerns:
            score = RankingAlgorithm.calculate_priority(c)
            ranked_list.append(RankedConcern(concern=c, priority_score=score))
            
        # Sort descending by priority_score
        ranked_list.sort(key=lambda x: x.priority_score, reverse=True)
        
        primary = ranked_list[0].concern.name
        secondary = [r.concern.name for r in ranked_list[1:3]] if len(ranked_list) > 1 else []
        associated = [r.concern.name for r in ranked_list[3:]] if len(ranked_list) > 3 else []
        
        return {
            "primary_concern": primary,
            "secondary_contributors": secondary,
            "associated_effects": associated,
            "top_score": ranked_list[0].priority_score
        }
