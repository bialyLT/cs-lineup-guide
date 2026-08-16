"""Generación de quizzes a partir del contenido desbloqueado del usuario."""
from django.db import transaction

from apps.maps.models import Map
from apps.progression.services import available_questions

from .models import Quiz, QuizQuestion


class QuizGenerationError(Exception):
    code = "quiz_generation_error"


@transaction.atomic
def generate_quiz(
    user,
    maps: "models.QuerySet[Map]",
    title: str = "",
    place_ids=None,
    question_type: str | None = None,
    count: int | None = None,
) -> Quiz:
    # El primer quiz del usuario es de lugares (map_location): enseña dónde
    # están los lugares que eligió al empezar. Después, quizzes completos.
    is_first_quiz = not Quiz.objects.filter(user=user).exists()
    places_only = is_first_quiz and not place_ids and not question_type

    questions = available_questions(
        user,
        maps,
        places_only=places_only,
        place_ids=place_ids,
        question_type=question_type,
    ).order_by(
        "map__order", "place__order", "lineup__place__order", "lineup__order", "id"
    )
    if count is not None:
        questions = questions[:max(1, count)]
    questions = list(questions)

    if not questions:
        raise QuizGenerationError(
            "No hay preguntas disponibles para esa selección."
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


def available_question_count(
    user,
    maps: "models.QuerySet[Map]",
    place_ids=None,
    question_type: str | None = None,
) -> int:
    """Cantidad de preguntas disponibles para una selección (máximo del quiz)."""
    return available_questions(
        user, maps, place_ids=place_ids, question_type=question_type
    ).count()