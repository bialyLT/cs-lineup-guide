from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Usuario del sistema. Se mantiene AbstractUser (username + email + password)."""

    display_name = models.CharField("nombre visible", max_length=50, blank=True)
    is_email_verified = models.BooleanField(
        "email verificado",
        default=False,
        help_text="Indica si el usuario confirmó su correo (las cuentas de Google vienen verificadas).",
    )

    class Meta:
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"

    def __str__(self) -> str:
        return self.display_name or self.username


class EmailVerification(models.Model):
    """Código de verificación de email para una cuenta con email/contraseña.

    Se reusa la misma fila al reenviar (upsert por usuario). El código expira
    y tiene un límite de intentos para evitar fuerza bruta.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_verification",
    )
    code = models.CharField("código", max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField("vence")
    attempts = models.PositiveIntegerField("intentos", default=0)

    class Meta:
        verbose_name = "verificación de email"
        verbose_name_plural = "verificaciones de email"

    def __str__(self) -> str:
        return f"{self.user} · {self.code}"