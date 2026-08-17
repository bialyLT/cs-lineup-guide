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


class UserLineupUnlock(models.Model):
    """Desbloqueo de un lineup pagado con monedas (candado separado del lugar)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lineup_unlocks"
    )
    lineup = models.ForeignKey(
        "maps.Lineup", on_delete=models.CASCADE, related_name="user_unlocks"
    )
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "lineup"], name="unique_lineup_unlock")
        ]
        verbose_name = "desbloqueo de lineup"
        verbose_name_plural = "desbloqueos de lineup"


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


class QuestionTypeConfig(models.Model):
    """Configuración de desbloqueo de cada tipo de pregunta.

    Cada tipo tiene un nivel de desbloqueo (0 = desde el inicio, 1+ = nivel
    requerido, vacío = solo con monedas) y, para el tipo de utilidad, los
    niveles por utilidad (restricción: la pregunta exige además la utilidad
    del lineup desbloqueada). El admin la edita desde "Tipos de pregunta".
    """

    question_type = models.CharField(
        "tipo de pregunta",
        max_length=20,
        unique=True,
        choices=QuestionType.choices,
    )
    label = models.CharField("etiqueta", max_length=100)
    unlock_level = models.PositiveIntegerField(
        "nivel de desbloqueo",
        null=True,
        blank=True,
        help_text="0 = desde el inicio. 1+ = nivel requerido. Vacío = solo con monedas.",
    )
    order = models.PositiveSmallIntegerField("orden", default=0)
    utility_levels = models.TextField(
        "niveles por utilidad",
        blank=True,
        help_text=(
            'Solo para "¿Qué utilidad lanzar?": JSON '
            '{"smoke": 2, "molotov": 3, "flashbang": 4, "he": 5, "decoy": 6}.'
        ),
    )

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "configuración de tipo de pregunta"
        verbose_name_plural = "configuración de tipos de pregunta"

    def __str__(self) -> str:
        return self.label