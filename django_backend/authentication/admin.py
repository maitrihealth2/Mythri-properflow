from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from unfold.admin import ModelAdmin
from import_export.admin import ImportExportModelAdmin
from .models import User

class UserAdmin(BaseUserAdmin, ModelAdmin, ImportExportModelAdmin):
    pass

admin.site.register(User, UserAdmin)
