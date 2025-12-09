"""
WSGI config for loomserver project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'loomserver.settings')

# Initialize Django application
application = get_wsgi_application()

# -------------------------------------------
# Auto-create admin user on first startup
# -------------------------------------------
try:
    from .create_admin import create_default_superuser
    create_default_superuser()
except Exception as e:
    print("⚠ Auto-admin creation skipped:", e)
