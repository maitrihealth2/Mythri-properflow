from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # AbstractUser already provides id, username, email, password, is_active, date_joined (as created_at)
    preferred_language = models.CharField(max_length=10, default="en-IN", help_text="Language code like en-IN, hi-IN")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(null=True, blank=True)
    age = models.IntegerField(null=True, blank=True)
    preferred_name = models.CharField(max_length=50, null=True, blank=True)
    therapy_focus = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_profiles'


class UserPreferences(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    theme = models.CharField(max_length=20, default="system")
    notifications_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_preferences'


class UserGoal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goals')
    title = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, default="in_progress")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    target_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'user_goals'


class UserJournal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='journals')
    title = models.CharField(max_length=100, null=True, blank=True)
    content = models.TextField()
    mood = models.CharField(max_length=30, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_journals'


class Session(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    session_token = models.CharField(max_length=100, unique=True, db_index=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    channel = models.CharField(max_length=20, default="web")
    is_crisis_flagged = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sessions'


class Message(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    language = models.CharField(max_length=10, default="en-IN")
    is_crisis_flagged = models.BooleanField(default=False)

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']


class MessageEmotion(models.Model):
    message = models.OneToOneField(Message, on_delete=models.CASCADE, related_name='emotion')
    emotion_label = models.CharField(max_length=50)
    score = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'message_emotions'


class CompanionMemory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memories')
    memory_type = models.CharField(max_length=50)
    content = models.TextField()
    importance_score = models.FloatField(default=1.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'companion_memories'


class UserPersonaProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='persona')
    onboarding_complete = models.BooleanField(default=False)
    initial_presenting_topic = models.TextField(null=True, blank=True)
    communication_style = models.CharField(max_length=20, default="unknown")
    processing_preference = models.CharField(max_length=20, default="unknown")
    life_focus_areas = models.JSONField(default=list)
    avg_message_length_trend = models.CharField(max_length=20, default="unknown")
    language_absolutism_score = models.FloatField(default=0.0)
    emotional_range = models.JSONField(default=list)
    dominant_emotion = models.CharField(max_length=50, null=True, blank=True)
    behavioral_notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_persona_profiles'


class ExerciseLog(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='exercise_logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exercise_logs')
    exercise_type = models.CharField(max_length=30)
    triggered_by = models.CharField(max_length=30)
    state = models.CharField(max_length=30, default="suggested")
    pre_emotion = models.CharField(max_length=50, null=True, blank=True)
    post_emotion = models.CharField(max_length=50, null=True, blank=True)
    user_feedback = models.TextField(null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'exercise_logs'


class ConsultationNote(models.Model):
    session = models.OneToOneField(Session, on_delete=models.CASCADE, related_name='note')
    summary = models.TextField()
    key_insights = models.TextField(null=True, blank=True)
    next_steps = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'consultation_notes'


class SessionFeedback(models.Model):
    session = models.OneToOneField(Session, on_delete=models.CASCADE, related_name='feedback')
    rating = models.IntegerField()
    comments = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'session_feedbacks'


class RiskLog(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='risk_logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='risk_logs')
    trigger_phrase = models.TextField()
    system_response = models.TextField()
    helpline_shown = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'risk_logs'


class UserFeedback(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedback_submissions')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_feedback'
