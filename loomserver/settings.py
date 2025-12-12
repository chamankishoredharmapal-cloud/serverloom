import os
from pathlib import Path
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

# ===========================
# SECURITY
# ===========================
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")
DEBUG = os.environ.get("DEBUG", "False") == "True"

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    os.environ.get("RAILWAY_PUBLIC_DOMAIN"),
    os.environ.get("RENDER_EXTERNAL_HOSTNAME"),
    "*"
]


# ===========================
# APPS
# ===========================
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "cloudinary",
    "cloudinary_storage",

    "accounts",
    "core",
]


# ===========================
# MIDDLEWARE
# ===========================
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # required
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "loomserver.urls"
WSGI_APPLICATION = "loomserver.wsgi.application"


# ===========================
# DATABASE (Railway)
# ===========================
DATABASES = {
    "default": dj_database_url.parse(
        os.environ.get("DATABASE_URL"),
        conn_max_age=600,
        ssl_require=False
    )
}


# ===========================
# TEMPLATES
# ===========================
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# ===========================
# STATIC / WHITENOISE
# ===========================
STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]   # your local static folder
STATIC_ROOT = BASE_DIR / "staticfiles"     # Railway collects here

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"


# ===========================
# MEDIA / CLOUDINARY
# ===========================
MEDIA_URL = "/media/"

DEFAULT_FILE_STORAGE = "cloudinary_storage.storage.MediaCloudinaryStorage"

CLOUDINARY_STORAGE = {
    "CLOUD_NAME": os.environ.get("CLOUDINARY_CLOUD_NAME"),
    "API_KEY": os.environ.get("CLOUDINARY_API_KEY"),
    "API_SECRET": os.environ.get("CLOUDINARY_API_SECRET"),
}


# ===========================
# DEFAULTS
# ===========================
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
