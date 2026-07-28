import zipfile
import io
from django.http import HttpResponse
from django.contrib.admin.views.decorators import staff_member_required
from django.apps import apps
from import_export import resources

@staff_member_required
def export_all_data(request):
    """
    Exports all registered models' data as CSVs, bundles them into a ZIP file,
    and returns it as a response.
    """
    buffer = io.BytesIO()
    
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for app_config in apps.get_app_configs():
            # Skip built-in django apps that might be noisy
            if app_config.name in ['admin', 'auth', 'contenttypes', 'sessions']:
                continue
                
            for model_name, model in app_config.models.items():
                try:
                    # Dynamically create a resource for the model
                    model_resource = resources.modelresource_factory(model=model)()
                    dataset = model_resource.export()
                    
                    # Convert to CSV format
                    csv_data = dataset.csv
                    if csv_data:
                        # Write to zip file
                        file_name = f"{app_config.name}_{model_name}.csv"
                        zip_file.writestr(file_name, csv_data)
                except Exception as e:
                    # Skip models that can't be exported easily (e.g. abstract or no data)
                    pass

    buffer.seek(0)
    response = HttpResponse(buffer.getvalue(), content_type='application/zip')
    response['Content-Disposition'] = 'attachment; filename="mindbridge_full_export.zip"'
    return response
