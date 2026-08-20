"""Servicios de verificación de email.

Flujo: al registrarse con email/contraseña se crea la cuenta sin acceso,
se genera un código de 6 dígitos y se envía un correo con el código y un
botón de verificación. Recién cuando el usuario valida (clic en el correo o
ingresando el código en la app) puede iniciar sesión.
"""
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

from .models import EmailVerification, User

logger = logging.getLogger(__name__)

VERIFICATION_HOURS = 24
MAX_ATTEMPTS = 5


def _verification_params() -> tuple[int, int]:
    hours = int(getattr(settings, "EMAIL_VERIFICATION_HOURS", VERIFICATION_HOURS))
    attempts = int(getattr(settings, "EMAIL_VERIFICATION_MAX_ATTEMPTS", MAX_ATTEMPTS))
    return hours, attempts


class VerificationError(Exception):
    """Error de verificación con un código para la API."""

    def __init__(self, message: str, code: str = "verification_error"):
        super().__init__(message)
        self.code = code


def _generate_code() -> str:
    return f"{secrets.randbelow(1000000):06d}"


def _verification_link(user: User, code: str) -> str:
    from urllib.parse import quote

    frontend = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    query = f"email={quote(user.email or '')}&code={quote(code)}"
    return f"{frontend}/verify-email?{query}"


def create_email_verification(user: User) -> EmailVerification:
    """Crea o regenera (upsert) la verificación de email del usuario."""
    hours, _ = _verification_params()
    code = _generate_code()
    verification, _ = EmailVerification.objects.update_or_create(
        user=user,
        defaults={
            "code": code,
            "expires_at": timezone.now() + timedelta(hours=hours),
            "attempts": 0,
        },
    )
    return verification


def send_verification_email(user: User) -> EmailVerification:
    """Envía el correo con el código y el botón de verificación."""
    verification = create_email_verification(user)
    email = user.email
    if not email:
        raise VerificationError(
            "El usuario no tiene un email asociado.", code="no_email"
        )

    link = _verification_link(user, verification.code)
    subject = "Confirmá tu email en LineupLab"
    message = render_to_string(
        "accounts/verification_email.txt",
        {"code": verification.code, "link": link, "user": user},
    )
    html_message = render_to_string(
        "accounts/verification_email.html",
        {"code": verification.code, "link": link, "user": user},
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as exc:  # el envío falló pero la cuenta queda creada
        logger.exception("No se pudo enviar el email de verificación: %s", exc)
        raise VerificationError(
            "No se pudo enviar el correo de verificación. Intentá de nuevo más tarde.",
            code="send_failed",
        ) from exc

    return verification


def using_console_backend() -> bool:
    return getattr(settings, "EMAIL_BACKEND", "").endswith("console.EmailBackend")


def verify_email_code(user: User, code: str) -> User:
    """Valida el código y marca el email como verificado.

    Lanza VerificationError si el código es inválido, venció o se agotaron
    los intentos. Al verificar se elimina el registro de verificación.
    """
    verification = EmailVerification.objects.filter(user=user).first()
    if verification is None:
        raise VerificationError(
            "No hay una verificación pendiente. Pedí un código nuevo.",
            code="no_verification",
        )

    hours, max_attempts = _verification_params()
    if timezone.now() > verification.expires_at:
        verification.delete()
        raise VerificationError(
            "El código venció. Pedí uno nuevo.", code="expired"
        )

    if verification.attempts >= max_attempts:
        verification.delete()
        raise VerificationError(
            "Demasiados intentos fallidos. Pedí un código nuevo.", code="too_many_attempts"
        )

    if code.strip() != verification.code:
        verification.attempts += 1
        verification.save(update_fields=["attempts"])
        remaining = max_attempts - verification.attempts
        raise VerificationError(
            f"Código incorrecto. Te quedan {remaining} intento(s).",
            code="invalid_code",
        )

    verification.delete()
    user.is_email_verified = True
    user.save(update_fields=["is_email_verified"])
    return user
