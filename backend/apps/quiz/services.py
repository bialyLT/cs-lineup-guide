"""Generación de quizzes a partir del contenido desbloqueado del usuario."""
from django.db import transaction

from apps.maps.models import Map
from apps.progression.services import available_questions, ensure_starter_place

from .models import Quiz, QuizQuestion


class QuizGenerationError(Exception):
    code = "quiz_generation_error"


@transaction.atomic
def generate_quiz(user, maps: "models.QuerySet[Map]", title: str = "") -> Quiz:
    # Primera vez: desbloquear un lugar de arranque para poder jugar.
    ensure_starter_place(user)
    questions = list(
        available_questions(user, maps).order_by(
            "lineup__place__order", "lineup__order", "id"
        )
    )
    if not questions:
        raise QuizGenerationError(
            "No hay contenido desbloqueado: desbloqueá un lugar o un tipo de pregunta."
        )

    quiz = Quiz.objects.create(
        user=user,
        title=title or "Quiz personalizado",
    )
    quiz.maps.set(maps)
    QuizQuestion.objects.bulk_create(
        QuizQuestion(quiz=quiz, question=question, order=index)
        for index, question in enumerate(questions)
    )
    return quiz