"""
Django settings for loomserver project.
"""

from pathlib import Path
import os
import dj_database_url
from django.core.management.utils import get_random_secret_key

# ---------------------------------------------------------
# PATHS
# ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent


# ---------------------------------------------------------
# SECURITY / ENVIRONMENT
# ---------------------------------------------------------
DEBUG = os.environ.get("DEBUG", "False") == "True"

# SECRET KEY (never hardcode in production)
SECRET_KEY = os.environ.get("SECRET_KEY", get_random_secret_key())

# Allowed hosts
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*").split(",")


# ---------------------------------------------------------
# APPLICATIONS
# ---------------------------------------------------------
INSTALLED_APPS = [
    # Django default apps
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Your apps
    "accounts",
    "core",

    # Media storage
    "cloudinary",
    "cloudinary_storage",
]


# ---------------------------------------------------------
# MIDDLEWARE
# ---------------------------------------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",

    # Whitenoise for static files
    "whitenoise.middleware.WhiteNoiseMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ---------------------------------------------------------
# URLS
# ---------------------------------------------------------
ROOT_URLCONF = "loomserver.urls"


# ---------------------------------------------------------
# TEMPLATES
# ---------------------------------------------------------
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# ---------------------------------------------------------
# WSGI
# ---------------------------------------------------------
WSGI_APPLICATION = "loomserver.wsgi.application"


# ---------------------------------------------------------
# DATABASE CONFIG
# ---------------------------------------------------------

# LOCAL DEV = sqlite
# RENDER PRODUCTION = PostgreSQL via DATABASE_URL

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=True
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# ---------------------------------------------------------
# PASSWORD VALIDATION
# ---------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# ---------------------------------------------------------
# INTERNATIONALIZATION
# ---------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# ---------------------------------------------------------
# STATIC FILES (CSS/JS)
# ---------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STATICFILES_DIRS = [
    BASE_DIR / "static",
]

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

STATIC_ROOT = BASE_DIR / "staticfiles"



STATICFILES_DIRS = [
    BASE_DIR / "static",
]


# ---------------------------------------------------------
# MEDIA FILES (Cloudinary)
# ---------------------------------------------------------
USE_CLOUDINARY = os.environ.get("USE_CLOUDINARY", "True") == "True"

if USE_CLOUDINARY:
    DEFAULT_FILE_STORAGE = "cloudinary_storage.storage.MediaCloudinaryStorage"
    MEDIA_URL = "/media/"

    CLOUDINARY_STORAGE = {
        "CLOUD_NAME": os.environ.get("CLOUDINARY_CLOUD_NAME"),
        "API_KEY": os.environ.get("CLOUDINARY_API_KEY"),
        "API_SECRET": os.environ.get("CLOUDINARY_API_SECRET"),
    }
else:
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "mediafiles"


# ---------------------------------------------------------
# LOGIN SETTINGS
# ---------------------------------------------------------
LOGIN_URL = "/login/"


# ---------------------------------------------------------
# SECURITY HEADERS FOR RENDER
# ---------------------------------------------------------
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True


# ---------------------------------------------------------
# LOGGING (BASIC)
# ---------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}


# ---------------------------------------------------------
# DEFAULT AUTO FIELD
# ---------------------------------------------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
