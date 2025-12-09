"""
WSGI config for loomserver project.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loomserver.settings")

application = get_wsgi_application()

# Safely auto-create admin
try:
    from .create_admin import create_default_superuser
    create_default_superuser()
except Exception as e:
    print("⚠ Auto-admin creation skipped:", e)
