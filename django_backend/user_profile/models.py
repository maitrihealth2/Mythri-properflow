from django.db import models
from django.conf import settings

class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(null=True, blank=True, help_text="User-provided biographical context")
    age = models.IntegerField(null=True, blank=True)
    preferred_name = models.CharField(max_length=50, null=True, blank=True, help_text="Name the AI should use to address the user")
    therapy_focus = models.CharField(max_length=100, null=True, blank=True, help_text="Main focus area (e.g. anxiety, relationships)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_profiles'


class UserPreferences(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='preferences')
    theme = models.CharField(max_length=20, default="system", help_text="UI Theme (light, dark, system)")
    notifications_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_preferences'


class UserGoal(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='goals')
    title = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, default="in_progress", help_text="Expected values: in_progress, achieved, abandoned")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    target_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'user_goals'


class UserJournal(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='journals')
    title = models.CharField(max_length=100, null=True, blank=True)
    content = models.TextField()
    mood = models.CharField(max_length=30, null=True, blank=True, help_text="Mood associated with the entry")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_journals'


class UserPersonaProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='persona')
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
