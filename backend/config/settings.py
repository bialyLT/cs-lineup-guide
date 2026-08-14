"""
Django settings for LineupLab.

Configuración por entorno:

- DJANGO_SECRET_KEY   → clave secreta
- DJANGO_DEBUG        → "1" en desarrollo
- DJANGO_ALLOWED_HOSTS → hosts separados por coma
- DATABASE_URL        → postgres://usuario:pass@host:puerto/nombre
                        (si no se define, se usa SQLite para desarrollo)
- CORS_ALLOWED_ORIGINS → orígenes del frontend separados por coma
- GOOGLE_CLIENT_ID    → client ID de "Sign in with Google"
"""

import ast
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return ast.literal_eval(raw.strip().capitalize())


def env_list(name: str, default: list[str] | None = None) -> list[str]:
    raw = os.environ.get(name)
    if not raw:
        return default or []
    return [item.strip() for item in raw.split(",") if item.strip()]


def parse_database_url(url: str) -> dict[str, str]:
    """Convierte una URL de PostgreSQL en el dict de DATABASES de Django."""
    from urllib.parse import parse_qs, unquote, urlparse

    parsed = urlparse(url)
    db: dict[str, str] = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": parsed.path.lstrip("/"),
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "localhost",
        "PORT": str(parsed.port or "5432"),
    }
    query = parse_qs(parsed.query)
    if "sslmode" in query:
        db["OPTIONS"] = {"sslmode": query["sslmode"][0]}
    return db


SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "dev-insecure-key-lineuplab-2026-change-me-please-0123456789abcdef",
)
DEBUG = env_bool("DJANGO_DEBUG", default=True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["*"]) if DEBUG else env_list("DJANGO_ALLOWED_HOSTS")

# Sign in with Google (ID token). Vacío deshabilita el login con Google.
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")

# Application definition ---------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    # Apps del dominio
    "apps.accounts",
    "apps.maps",
    "apps.quiz",
    "apps.progression",
    # Panel de administración (CRUD protegido por is_staff)
    "apps.adminpanel",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
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

WSGI_APPLICATION = "config.wsgi.application"

# Database ---------------------------------------------------------------

_database_url = os.environ.get("DATABASE_URL")
if _database_url:
    DATABASES = {
        "default": {"CONN_MAX_AGE": 60, **parse_database_url(_database_url)},
    }
else:
    DATABASES = {
        # Fallback de desarrollo sin PostgreSQL instalado.
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        },
    }

AUTH_USER_MODEL = "accounts.User"

# Password validation -----------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalization ----------------------------------------------------

LANGUAGE_CODE = "es"
TIME_ZONE = "America/Argentina/Buenos_Aires"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Django REST Framework --------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# CORS -------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
)

# Cloudflare R2 (imágenes de mapas y quizzes) -----------------------------

R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "cslineupsguide")
R2_ENDPOINT_URL = os.environ.get(
    "R2_ENDPOINT_URL",
    "https://97c0b5f961934c102e3b4b8eb9277f0d.r2.cloudflarestorage.com",
)
# URL pública base (dominio r2.dev o custom) para servir las imágenes.
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL", "").rstrip("/")

# Tamaño máximo de imagen subida al bucket (10 MB).
R2_MAX_UPLOAD_BYTES = int(os.environ.get("R2_MAX_UPLOAD_BYTES", 10 * 1024 * 1024))