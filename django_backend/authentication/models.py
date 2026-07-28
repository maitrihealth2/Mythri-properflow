from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # username and email are already in AbstractUser
    # email is made unique in AbstractUser, but we'll enforce it here if needed
    preferred_language = models.CharField(
        max_length=10, 
        default="en-IN", 
        help_text="Language code like en-IN, hi-IN, te-IN, ta-IN"
    )
    # The default AbstractUser has date_joined, which serves as created_at
    updated_at = models.DateTimeField(auto_now=True, help_text="Last modification timestamp")

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.username
