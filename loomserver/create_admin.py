# loomserver/create_admin.py
from django.contrib.auth import get_user_model
from django.db.utils import OperationalError, ProgrammingError

def create_default_superuser():
    User = get_user_model()
    try:
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(
                username="admin",
                email="admin@example.com",
                password="admin12345"
            )
            print("✔ Auto-created default admin user")
        else:
            print("✔ Admin already exists — skipping")
    except (OperationalError, ProgrammingError):
        # Happens if DB not ready yet (initial migration)
        print("⚠ Database not ready — admin creation skipped")
