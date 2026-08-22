from django.conf import settings
from django.db import models


class QuestionType(models.TextChoices):
    REFERENCE = "reference", "Adivinar la referencia"
    UTILITY = "utility", "¿Qué utilidad lanzar?"
    LANDING_SPOT = "landing_spot", "¿Dónde cae la utilidad?"
    KEY_COMBO = "key_combo", "Combinación de teclas"
    PLAYER_POSITION = "player_position", "Posición del jugador"
    MAP_LOCATION = "map_location", "Lugares del mapa"
    MAP_AREA = "map_area", "Zonas del mapa"


class Question(models.Model):
    """Pregunta de un quiz. Vive en un mapa y puede estar asociada a un
    lineup, a un lugar (sin lineup) o a ninguno (solo nivel de mapa)."""

    map = models.ForeignKey(
        "maps.Map", on_delete=models.CASCADE, related_name="questions"
    )
    # Opcional: la pregunta pertenece a un lineup (y por cascada a un lugar).
    lineup = models.ForeignKey(
        "maps.Lineup",
        on_delete=models.CASCADE,
        related_name="questions",
        null=True,
        blank=True,
    )
    # Opcional: pregunta de nivel de lugar (ej. "¿Qué lugar es este?"), sin lineup.
    place = models.ForeignKey(
        "maps.Place",
        on_delete=models.CASCADE,
        related_name="questions",
        null=True,
        blank=True,
    )
    type = models.CharField(
        "tipo", max_length=20, choices=QuestionType.choices
    )
    prompt = models.TextField("enunciado")
    helper_text = models.TextField("ayuda", blank=True)
    image_url = models.URLField("imagen", blank=True)

    class Meta:
        ordering = ["id"]
        verbose_name = "pregunta"
        verbose_name_plural = "preguntas"

    def __str__(self) -> str:
        return self.prompt[:60]


class Option(models.Model):
    """Opción de respuesta. Texto o punto relativo (según tipo de pregunta)."""

    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="options"
    )
    text = models.CharField("texto", max_length=255, blank=True)
    # Coordenadas relativas (0-100) sobre la imagen de la pregunta.
    position_x = models.DecimalField(
        "posición X", max_digits=5, decimal_places=2, null=True, blank=True
    )
    position_y = models.DecimalField(
        "posición Y", max_digits=5, decimal_places=2, null=True, blank=True
    )
    is_correct = models.BooleanField("correcta", default=False)
    order = models.PositiveSmallIntegerField("orden", default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "opción"
        verbose_name_plural = "opciones"

    def __str__(self) -> str:
        return self.text or f"Punto ({self.position_x}, {self.position_y})"


class Quiz(models.Model):
    """Quiz del usuario. Guarda los mapas elegidos y un snapshot de preguntas."""

    DIFFICULTY_EASY = "easy"
    DIFFICULTY_HARD = "hard"
    DIFFICULTY_CHOICES = [
        (DIFFICULTY_EASY, "Fácil"),
        (DIFFICULTY_HARD, "Difícil"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quizzes"
    )
    title = models.CharField("título", max_length=100)
    maps = models.ManyToManyField("maps.Map", related_name="quizzes", blank=True)
    difficulty = models.CharField(
        "dificultad",
        max_length=10,
        choices=DIFFICULTY_CHOICES,
        default=DIFFICULTY_EASY,
    )
    created_at = models.DateTimeField("creado", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "quiz"
        verbose_name_plural = "quizzes"

    def __str__(self) -> str:
        return self.title


class QuizQuestion(models.Model):
    """Snapshot ordenado de preguntas dentro de un quiz generado."""

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="quiz_questions")
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="quiz_questions"
    )
    order = models.PositiveSmallIntegerField("orden", default=0)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(
                fields=["quiz", "question"], name="unique_question_per_quiz"
            )
        ]
        verbose_name = "pregunta de quiz"
        verbose_name_plural = "preguntas de quiz"


class QuizAnswer(models.Model):
    """Respuesta registrada de una pregunta dentro de un quiz (idempotencia).

    Solo la primera respuesta de cada pregunta en un quiz otorga XP/monedas:
    los reintentos (p. ej. "Repetir quiz") devuelven la corrección pero no
    vuelven a premiar. Evita farmear monedas respondiendo la misma pregunta.
    """

    quiz_question = models.OneToOneField(
        QuizQuestion,
        on_delete=models.CASCADE,
        related_name="answer",
    )
    # Nulo en timeouts: la pregunta se respondió como incorrecta sin opción.
    option = models.ForeignKey(
        Option, on_delete=models.CASCADE, related_name="+", null=True, blank=True
    )
    # Para preguntas de zona (map_area): dónde tocó el usuario (0-100).
    tap_x = models.DecimalField(
        "toque X", max_digits=5, decimal_places=2, null=True, blank=True
    )
    tap_y = models.DecimalField(
        "toque Y", max_digits=5, decimal_places=2, null=True, blank=True
    )
    is_correct = models.BooleanField("correcta", default=False)
    answered_at = models.DateTimeField("respondida", auto_now_add=True)

    class Meta:
        verbose_name = "respuesta de quiz"
        verbose_name_plural = "respuestas de quiz"

    def __str__(self) -> str:
        return f"{self.quiz_question} · {'correcta' if self.is_correct else 'incorrecta'}"


class QuizConfig(models.Model):
    """Configuración global del quiz. Hoy: tiempo por pregunta en dificultad
    difícil y radio de tolerancia por defecto para preguntas de zona."""

    hard_seconds_per_question = models.PositiveIntegerField(
        "segundos por pregunta (difícil)", default=20
    )
    # Radio (en unidades 0-100 sobre la imagen) dentro del cual un toque cuenta
    # como acierto en preguntas de zona (map_area) cuando el lugar no define uno.
    default_hit_radius = models.DecimalField(
        "radio de zona por defecto",
        max_digits=5,
        decimal_places=2,
        default=12,
        help_text="En unidades 0-100 sobre la imagen. Se usa si el lugar no tiene radio propio.",
    )

    class Meta:
        verbose_name = "configuración de quiz"
        verbose_name_plural = "configuración de quiz"

    def __str__(self) -> str:
        return f"Difícil: {self.hard_seconds_per_question}s por pregunta"


class QuestionReport(models.Model):
    """Reporte anónimo de una pregunta (sin datos de quién lo hizo)."""

    REASON_LINEUP_INCORRECTO = "lineup_incorrecto"
    REASON_RESPUESTA_MAL = "respuesta_mal"
    REASON_OTRO = "otro"
    REASON_CHOICES = [
        (REASON_LINEUP_INCORRECTO, "Lineup incorrecto"),
        (REASON_RESPUESTA_MAL, "La respuesta está mal"),
        (REASON_OTRO, "Otro"),
    ]

    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="reports"
    )
    reason = models.CharField("motivo", max_length=30, choices=REASON_CHOICES)
    detail = models.TextField("detalle", blank=True)
    created_at = models.DateTimeField("creado", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "reporte de pregunta"
        verbose_name_plural = "reportes de pregunta"

    def __str__(self) -> str:
        return f"Reporte #{self.pk} · {self.get_reason_display()}"