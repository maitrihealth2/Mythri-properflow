from django.db import models
from django.conf import settings

class CompanionMemory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='memories')
    memory_type = models.CharField(max_length=50, help_text="Category: core_belief, event, preference, etc.")
    content = models.TextField()
    importance_score = models.FloatField(default=1.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'companion_memories'
