from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.database.base_model import Base, AbstractBaseModel

class User(AbstractBaseModel):
    __tablename__ = "users"
    __table_args__ = {'comment': 'Core user table storing authentication and base preferences'}
    
    username = Column(String(50), unique=True, index=True, nullable=False, comment="Unique handle chosen by the user")
    email = Column(String(100), unique=True, index=True, nullable=False, comment="User email for login and recovery")
    hashed_password = Column(String(200), nullable=False)
    preferred_language = Column(String(10), default="en-IN", comment="Language code like en-IN, hi-IN, te-IN, ta-IN")
    is_active = Column(Boolean, default=True)

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    preferences = relationship("UserPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("UserGoal", back_populates="user", cascade="all, delete-orphan")
    journals = relationship("UserJournal", back_populates="user", cascade="all, delete-orphan")
    memories = relationship("CompanionMemory", back_populates="user", cascade="all, delete-orphan")
    persona = relationship("UserPersonaProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    exercise_logs = relationship("ExerciseLog", back_populates="user", cascade="all, delete-orphan")


class UserProfile(AbstractBaseModel):
    __tablename__ = "user_profiles"
    __table_args__ = {'comment': 'Extended personal and therapeutic profile details'}
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    bio = Column(Text, nullable=True, comment="User-provided biographical context")
    age = Column(Integer, nullable=True)
    preferred_name = Column(String(50), nullable=True, comment="Name the AI should use to address the user")
    therapy_focus = Column(String(100), nullable=True, comment="Main focus area (e.g. anxiety, relationships)")

    user = relationship("User", back_populates="profile")


class UserPreferences(AbstractBaseModel):
    __tablename__ = "user_preferences"
    __table_args__ = {'comment': 'App settings and interface preferences'}
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    theme = Column(String(20), default="system", comment="UI Theme (light, dark, system)")
    notifications_enabled = Column(Boolean, default=True)

    user = relationship("User", back_populates="preferences")


class UserGoal(AbstractBaseModel):
    __tablename__ = "user_goals"
    __table_args__ = {'comment': 'Therapeutic goals set by the user'}
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="in_progress", comment="Expected values: in_progress, achieved, abandoned")
    target_date = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="goals")


class UserJournal(AbstractBaseModel):
    __tablename__ = "user_journals"
    __table_args__ = {'comment': 'Reflective journal entries written by the user'}
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(100), nullable=True)
    content = Column(Text, nullable=False)
    mood = Column(String(30), nullable=True, comment="Mood associated with the entry")

    user = relationship("User", back_populates="journals")


class Session(AbstractBaseModel):
    __tablename__ = "sessions"
    __table_args__ = {'comment': 'Conversation sessions between user and the companion'}
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    session_token = Column(String(100), unique=True, index=True, nullable=False)
    started_at = Column(DateTime(timezone=True), default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    channel = Column(String(20), default="web", comment="Interface used: web, voice, mobile")
    is_crisis_flagged = Column(Boolean, default=False, comment="True if any message in this session triggered crisis detection")

    user = relationship("User", back_populates="sessions")
    messages = relationship("Message", back_populates="session", order_by="Message.created_at", cascade="all, delete-orphan")
    note = relationship("ConsultationNote", back_populates="session", uselist=False, cascade="all, delete-orphan")
    feedback = relationship("SessionFeedback", back_populates="session", uselist=False, cascade="all, delete-orphan")
    risk_logs = relationship("RiskLog", back_populates="session", cascade="all, delete-orphan")


class Message(AbstractBaseModel):
    __tablename__ = "messages"
    __table_args__ = {'comment': 'Individual messages within a conversation session'}
    
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False)
    role = Column(String(20), nullable=False, comment="Speaker role: user, assistant, system")
    content = Column(Text, nullable=False)
    language = Column(String(10), default="en-IN")
    is_crisis_flagged = Column(Boolean, default=False)

    session = relationship("Session", back_populates="messages")
    emotion = relationship("MessageEmotion", back_populates="message", uselist=False, cascade="all, delete-orphan")


class MessageEmotion(AbstractBaseModel):
    __tablename__ = "message_emotions"
    __table_args__ = {'comment': 'Emotion classification for a specific message'}
    
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), unique=True, nullable=False)
    emotion_label = Column(String(50), nullable=False)
    score = Column(Float, nullable=False, comment="Confidence score of the emotion model")

    message = relationship("Message", back_populates="emotion")


class CompanionMemory(AbstractBaseModel):
    __tablename__ = "companion_memories"
    __table_args__ = {'comment': 'Extracted context that the AI should remember over time'}
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    memory_type = Column(String(50), nullable=False, comment="Category: core_belief, event, preference, etc.")
    content = Column(Text, nullable=False)
    importance_score = Column(Float, default=1.0)

    user = relationship("User", back_populates="memories")


class UserPersonaProfile(AbstractBaseModel):
    __tablename__ = "user_persona_profiles"
    __table_args__ = {'comment': 'Living psychological persona — updated each session from behavioral signals'}

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    onboarding_complete = Column(Boolean, default=False, comment="True once first-session discovery is finished")
    initial_presenting_topic = Column(Text, nullable=True, comment="What brought them here in session 1")
    communication_style = Column(String(20), default="unknown")
    processing_preference = Column(String(20), default="unknown")
    life_focus_areas = Column(JSON, default=list)
    avg_message_length_trend = Column(String(20), default="unknown")
    language_absolutism_score = Column(Float, default=0.0)
    emotional_range = Column(JSON, default=list)
    dominant_emotion = Column(String(50), nullable=True)
    behavioral_notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="persona")


class ExerciseLog(AbstractBaseModel):
    __tablename__ = "exercise_logs"
    __table_args__ = {'comment': 'Tracks exercise suggestion, engagement, and outcome per session'}

    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    exercise_type = Column(String(30), nullable=False)
    triggered_by = Column(String(30), nullable=False)
    state = Column(String(30), default="suggested")
    pre_emotion = Column(String(50), nullable=True)
    post_emotion = Column(String(50), nullable=True)
    user_feedback = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    session = relationship("Session", backref="exercise_logs")
    user = relationship("User", back_populates="exercise_logs")


class ConsultationNote(AbstractBaseModel):
    __tablename__ = "consultation_notes"
    __table_args__ = {'comment': 'AI-generated summary and insights for a session'}
    
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    summary = Column(Text, nullable=False)
    key_insights = Column(Text, nullable=True)
    next_steps = Column(Text, nullable=True)

    session = relationship("Session", back_populates="note")


class SessionFeedback(AbstractBaseModel):
    __tablename__ = "session_feedbacks"
    __table_args__ = {'comment': 'User feedback ratings for a session'}
    
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    rating = Column(Integer, nullable=False, comment="Rating from 1 to 5")
    comments = Column(Text, nullable=True)

    session = relationship("Session", back_populates="feedback")


class RiskLog(AbstractBaseModel):
    __tablename__ = "risk_logs"
    __table_args__ = {'comment': 'Audit logs of times the system detected high-risk user input'}
    
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    trigger_phrase = Column(Text, nullable=False)
    system_response = Column(Text, nullable=False)
    helpline_shown = Column(Boolean, default=True)

    session = relationship("Session", back_populates="risk_logs")


class UserFeedback(AbstractBaseModel):
    __tablename__ = "user_feedback"
    __table_args__ = {'comment': 'User feedback and feature requests'}

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    content = Column(Text, nullable=False)

    user = relationship("User")


class FeatureFlag(AbstractBaseModel):
    __tablename__ = "feature_flags"
    __table_args__ = {'comment': 'Feature flags for beta testing and gradual rollouts'}

    feature_name = Column(String(100), unique=True, index=True, nullable=False)
    is_active_for_all = Column(Boolean, default=False)
    beta_users_only = Column(Boolean, default=True)


class UserFeatureAccess(Base):
    __tablename__ = "user_feature_access"
    __table_args__ = {'comment': 'Mapping of beta users to specific features'}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    feature_name = Column(String(100), ForeignKey("feature_flags.feature_name", ondelete="CASCADE"), index=True, nullable=False)
    granted_at = Column(DateTime(timezone=True), default=func.now())
