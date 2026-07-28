from django.db import models
from django.conf import settings

class Session(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sessions')
    session_token = models.CharField(max_length=100, unique=True, db_index=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    channel = models.CharField(max_length=20, default="web", help_text="Interface used: web, voice, mobile")
    is_crisis_flagged = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sessions'


class Message(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, help_text="Speaker role: user, assistant, system")
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
    score = models.FloatField(help_text="Confidence score of the emotion model")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'message_emotions'


class ExerciseLog(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='exercise_logs')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='exercise_logs')
    
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
    rating = models.IntegerField(help_text="Rating from 1 to 5")
    comments = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'session_feedbacks'


class RiskLog(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='risk_logs')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='risk_logs')
    trigger_phrase = models.TextField()
    system_response = models.TextField()
    helpline_shown = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'risk_logs'
