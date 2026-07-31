from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional, List, Dict, Any
from src.database.models import (
    Session as DBSession, Message, MessageEmotion, 
    User, ExerciseLog, UserJournal, RiskLog
)
from datetime import datetime

class ConsultationRepository:
    def __init__(self, db: Session):
        self.db = db
        
    def create_session(self, user_id: int, session_token: str, channel: str = "web") -> DBSession:
        session = DBSession(user_id=user_id, session_token=session_token, channel=channel)
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session
        
    def get_user_session_count(self, user_id: int) -> int:
        return self.db.query(DBSession).filter(DBSession.user_id == user_id).count()
        
    def get_session_by_token(self, token: str, user_id: int) -> Optional[DBSession]:
        return self.db.query(DBSession).filter(
            DBSession.session_token == token,
            DBSession.user_id == user_id
        ).first()
        
    def log_risk(self, session_id: int, user_id: int, trigger: str, response: str) -> None:
        self.db.add(RiskLog(
            session_id=session_id, user_id=user_id,
            trigger_phrase=trigger,
            system_response=response, helpline_shown=True
        ))
        self.db.commit()
        
    def flag_session_crisis(self, session: DBSession) -> None:
        session.is_crisis_flagged = True
        self.db.commit()
        
    def get_recent_messages(self, session_id: int, limit: int = 30) -> List[Message]:
        past = self.db.query(Message).filter(
            Message.session_id == session_id
        ).order_by(Message.created_at.desc()).limit(limit).all()
        past.reverse()
        return past
        
    def suggest_exercise(self, session_id: int, user_id: int, exercise_type: str, pre_emotion: str) -> None:
        ex_log = ExerciseLog(
            session_id=session_id,
            user_id=user_id,
            exercise_type=exercise_type,
            triggered_by="assessor",
            state="suggested",
            pre_emotion=pre_emotion,
        )
        self.db.add(ex_log)
        self.db.commit()
        
    def complete_exercise(self, session_id: int, user_id: int, post_emotion: str, feedback: str) -> None:
        ex_log = self.db.query(ExerciseLog).filter(
            ExerciseLog.session_id == session_id,
            ExerciseLog.user_id == user_id,
            ExerciseLog.state.in_(["suggested", "in_progress", "awaiting_feedback"]),
        ).order_by(ExerciseLog.started_at.desc()).first()

        if ex_log:
            ex_log.state = "completed"
            ex_log.post_emotion = post_emotion
            ex_log.user_feedback = feedback[:500]
            ex_log.completed_at = func.now()
            self.db.commit()
            
    def save_messages(self, session_id: int, req_message: str, ai_response: str, language: str, emotion_label: Optional[str], emotion_score: float) -> None:
        user_msg = Message(session_id=session_id, role="user", content=req_message, language=language)
        self.db.add(user_msg)
        self.db.flush()

        if emotion_label:
            self.db.add(MessageEmotion(message_id=user_msg.id, emotion_label=emotion_label, score=emotion_score))

        ai_msg = Message(session_id=session_id, role="assistant", content=ai_response, language=language)
        self.db.add(ai_msg)
        self.db.commit()
        
    def get_user_history(self, user_id: int) -> List[DBSession]:
        return self.db.query(DBSession).filter(
            DBSession.user_id == user_id
        ).order_by(DBSession.started_at.desc()).all()
        
    def get_session_transcript(self, token: str, user_id: int) -> Optional[DBSession]:
        return self.db.query(DBSession).options(
            joinedload(DBSession.messages).joinedload(Message.emotion)
        ).filter(
            DBSession.session_token == token,
            DBSession.user_id == user_id,
        ).first()
