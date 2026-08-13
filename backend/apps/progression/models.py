from django.conf import settings
from django.db import models

from apps.quiz.models import QuestionType


class Progression(models.Model):
    """Contadores del usuario. El nivel se deriva de la xp (nunca se guarda)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="progression"
    )
    xp = models.PositiveIntegerField("experiencia", default=0)
    coins = models.PositiveIntegerField("monedas", default=0)
    streak = models.PositiveIntegerField("racha", default=0)
    best_streak = models.PositiveIntegerField("mejor racha", default=0)
    last_streak_at = models.DateTimeField("última racha", null=True, blank=True)

    class Meta:
        verbose_name = "progresión"
        verbose_name_plural = "progresiones"

    def __str__(self) -> str:
        return f"{self.user} · {self.xp} XP · {self.coins} monedas"


class UserMapUnlock(models.Model):
    """Desbloqueo de un mapa pagado con monedas."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="map_unlocks"
    )
    map = models.ForeignKey("maps.Map", on_delete=models.CASCADE, related_name="user_unlocks")
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "map"], name="unique_map_unlock")
        ]
        verbose_name = "desbloqueo de mapa"
        verbose_name_plural = "desbloqueos de mapa"


class UserPlaceUnlock(models.Model):
    """Desbloqueo de un lugar. via free = el único lugar gratuito elegido por el usuario."""

    class Via(models.TextChoices):
        FREE = "free", "Gratuito (único)"
        STARTER = "starter", "Inicial"
        COINS = "coins", "Monedas"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="place_unlocks"
    )
    place = models.ForeignKey("maps.Place", on_delete=models.CASCADE, related_name="user_unlocks")
    via = models.CharField("vía", max_length=10, choices=Via.choices, default=Via.COINS)
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "place"], name="unique_place_unlock")
        ]
        verbose_name = "desbloqueo de lugar"
        verbose_name_plural = "desbloqueos de lugar"


class UserQuestionTypeUnlock(models.Model):
    """Desbloqueo de un tipo de pregunta (candado separado del lugar/lineup)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="question_type_unlocks",
    )
    question_type = models.CharField(
        "tipo de pregunta", max_length=20, choices=QuestionType.choices
    )
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "question_type"], name="unique_question_type_unlock"
            )
        ]
        verbose_name = "desbloqueo de tipo de pregunta"
        verbose_name_plural = "desbloqueos de tipo de pregunta"