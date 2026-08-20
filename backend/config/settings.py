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

from django.core.exceptions import ImproperlyConfigured
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


# La clave se exige siempre (dev y prod): si falta, Django no arranca. Nunca
# hay un valor por defecto comprometido en el código.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY debe definirse en backend/.env (o en Railway). "
        "Generala con: openssl rand -hex 48"
    )

# DEBUG solo se activa explícitamente; por defecto es False (seguro).
DEBUG = env_bool("DJANGO_DEBUG", default=False)

# Railway expone el dominio del servicio en RAILWAY_PUBLIC_DOMAIN: se agrega
# solo para que el backend funcione sin configurar ALLOWED_HOSTS a mano.
_railway_domain = os.environ.get("RAILWAY_PUBLIC_DOMAIN", "")
if DEBUG:
    ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["localhost", "127.0.0.1"])
else:
    hosts = env_list("DJANGO_ALLOWED_HOSTS")
    if _railway_domain and _railway_domain not in hosts:
        hosts.append(_railway_domain)
    if not hosts:
        raise ImproperlyConfigured(
            "En producción hay que definir DJANGO_ALLOWED_HOSTS "
            "(y/o RAILWAY_PUBLIC_DOMAIN). No se usa * por defecto."
        )
    ALLOWED_HOSTS = hosts

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
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
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
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# En Railway/Vercel el TLS lo termina el proxy: se confía en el header
# X-Forwarded-Proto para que Django genere URLs https correctas.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")

# Protecciones de TLS solo en producción (en dev local se sirve HTTP).
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# Django REST Framework --------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        # Los datos de la app exigen email verificado (cuentas de Google lo
        # tienen; las de email/contraseña recién al completar la verificación).
        "apps.accounts.permissions.IsVerifiedUser",
    ),
    # Límites por scope. Los scopes de auth usan IP; los de juego, usuario.
    "DEFAULT_THROTTLE_RATES": {
        "auth_login": "5/min",
        "auth_register": "3/min",
        "auth_email": "5/min",
        "auth_resend": "5/min",
        "auth_verify": "10/min",
        "quiz_generate": "20/min",
        "answer": "60/min",
    },
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
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "")
R2_ENDPOINT_URL = os.environ.get("R2_ENDPOINT_URL", "")
# URL pública base (dominio r2.dev o custom) para servir las imágenes.
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL", "").rstrip("/")

# Tamaño máximo de imagen subida al bucket (10 MB).
R2_MAX_UPLOAD_BYTES = int(os.environ.get("R2_MAX_UPLOAD_BYTES", 10 * 1024 * 1024))

# Email (verificación de cuentas) -----------------------------------------

# URL pública del frontend, usada en el botón "Verificar mi email".
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")

# Sin EMAIL_HOST configurado se usa el backend de consola: el correo (y el
# código) se imprime en la terminal para desarrollo. Con EMAIL_HOST se usa SMTP
# (en producción: Brevo → smtp-relay.brevo.com:587, ver backend/.env.example).
EMAIL_BACKEND = (
    "django.core.mail.backends.smtp.EmailBackend"
    if os.environ.get("EMAIL_HOST")
    else "django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", default=True)
DEFAULT_FROM_EMAIL = os.environ.get(
    "DEFAULT_FROM_EMAIL", "LineupLab <no-reply@lineuplab.app>"
)

# Con SMTP configurado el remitente debe ser un email verificado en el
# proveedor (Brevo → Senders): el default no se puede usar para enviar.
if EMAIL_HOST and DEFAULT_FROM_EMAIL.endswith("no-reply@lineuplab.app>"):
    raise ImproperlyConfigured(
        "Con EMAIL_HOST hay que definir DEFAULT_FROM_EMAIL con un remitente "
        "verificado en Brevo (Senders)."
    )

# Duración y reintentos del código de verificación de email.
EMAIL_VERIFICATION_HOURS = int(os.environ.get("EMAIL_VERIFICATION_HOURS", "24"))
EMAIL_VERIFICATION_MAX_ATTEMPTS = int(
    os.environ.get("EMAIL_VERIFICATION_MAX_ATTEMPTS", "5")
)