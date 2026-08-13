from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Usuario del sistema. Se mantiene AbstractUser (username + email + password)."""

    display_name = models.CharField("nombre visible", max_length=50, blank=True)

    class Meta:
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"

    def __str__(self) -> str:
        return self.display_name or self.username