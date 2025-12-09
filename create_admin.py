# loomserver/create_admin.py

from django.contrib.auth import get_user_model
from django.db.utils import OperationalError

def create_default_superuser():
    User = get_user_model()
    try:
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(
                "admin",
                "admin@example.com",
                "admin123",
            )
            print("✔ Auto-created superuser (admin)")
        else:
            print("✔ Superuser already exists")
    except OperationalError:
        print("⚠ Database not ready — skipping admin creation")
