# settings/production.py (or inside settings.py using env)
import os
import dj_database_url
from pathlib import Path

ENV = os.environ

DATABASES = {
    "default": dj_database_url.parse(
        ENV.get("DATABASE_URL", "postgres://user:pass@127.0.0.1:5432/loomdb"),
        conn_max_age=int(ENV.get("CONN_MAX_AGE", 600)),
        ssl_require=ENV.get("DB_SSL", "True").lower() in ("true", "1", "yes"),
    )
}

# Wrap each view in a transaction automatically (helps data integrity)
DATABASES["default"]["ATOMIC_REQUESTS"] = True

# Optional: reduce back-and-forth by reusing connections
CONN_MAX_AGE = int(ENV.get("CONN_MAX_AGE", 600))

# SECURITY (production)
DEBUG = False
SECRET_KEY = ENV.get("SECRET_KEY")
ALLOWED_HOSTS = ENV.get("ALLOWED_HOSTS", "example.com").split(",")

# Static / media settings (ensure collectstatic runs)
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# Optional: configure connection health checks
DATABASES["default"]["OPTIONS"] = {"connect_timeout": 5}
