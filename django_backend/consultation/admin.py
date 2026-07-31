from django.contrib import admin
from django.apps import apps
from unfold.admin import ModelAdmin
from import_export.admin import ImportExportModelAdmin

app = apps.get_app_config('consultation')

for model_name, model in app.models.items():
    # Dynamically create an admin class for each model
    admin_class = type(f"{model.__name__}Admin", (ModelAdmin, ImportExportModelAdmin), {})
    admin.site.register(model, admin_class)
