"""Generación de quizzes a partir del contenido desbloqueado del usuario."""
import random

from django.db import transaction

from apps.maps.models import Map, Place
from apps.progression.services import available_questions

from .models import Option, Question, QuestionType, Quiz, QuizConfig, QuizQuestion

MAP_LOCATION_PROMPT_PREFIX = "Marcá en el mapa dónde está"
MAP_LOCATION_HELPER = "Elegí en el mapa el lugar que se indica."


def sync_map_location_questions(map_: Map) -> None:
    """Garantiza la pregunta de lugar (map_location) de cada lugar del mapa.

    Todo lugar con posición sobre un mapa con imagen recibe su pregunta
    "Marcá en el mapa dónde está X." y sus opciones se reconstruyen para
    reflejar todos los lugares marcados del mapa. Se invoca al crear, editar o
    borrar lugares desde el panel de administración.
    """
    places = list(
        map_.places.filter(
            position_x__isnull=False, position_y__isnull=False
        ).order_by("order")
    )
    if len(places) < 2 or not map_.image_url:
        return

    for place in places:
        prompt = f"{MAP_LOCATION_PROMPT_PREFIX} {place.name}."
        question, _ = Question.objects.get_or_create(
            map=map_,
            type=QuestionType.MAP_LOCATION,
            place=place,
            defaults={
                "prompt": prompt,
                "helper_text": MAP_LOCATION_HELPER,
                "image_url": map_.image_url,
            },
        )
        changed = False
        if question.prompt != prompt:
            question.prompt = prompt
            changed = True
        if question.image_url != map_.image_url:
            question.image_url = map_.image_url
            changed = True
        if changed:
            question.save(update_fields=["prompt", "image_url"])

        question.options.all().delete()
        Option.objects.bulk_create(
            Option(
                question=question,
                text="",
                position_x=candidate.position_x,
                position_y=candidate.position_y,
                is_correct=(candidate.id == place.id),
                order=index,
            )
            for index, candidate in enumerate(places, start=1)
        )


class QuizGenerationError(Exception):
    code = "quiz_generation_error"


@transaction.atomic
def get_quiz_config() -> QuizConfig:
    """Devuelve la configuración global del quiz (la crea con defaults si falta)."""
    config, _ = QuizConfig.objects.get_or_create(pk=1)
    return config


def generate_quiz(
    user,
    maps: "models.QuerySet[Map]",
    title: str = "",
    place_ids=None,
    lineup_ids=None,
    question_type: str | None = None,
    count: int | None = None,
    difficulty: str = Quiz.DIFFICULTY_EASY,
) -> Quiz:
    # El primer quiz del usuario es de lugares (map_location): enseña dónde
    # están los lugares que eligió al empezar. Después, quizzes completos.
    is_first_quiz = not Quiz.objects.filter(user=user).exists()
    places_only = is_first_quiz and not place_ids and not lineup_ids and not question_type

    questions = available_questions(
        user,
        maps,
        places_only=places_only,
        place_ids=place_ids,
        lineup_ids=lineup_ids,
        question_type=question_type,
    ).order_by(
        "map__order", "place__order", "lineup__order", "lineup__place__order", "id"
    )
    # Mezclamos ANTES de recortar a `count`: si cortáramos primero, como el
    # queryset viene ordenado por mapa/lugar/lineup, las primeras `count`
    # preguntas quedarían agrupadas (p.ej. todas de un mismo lineup). Así el
    # subconjunto es una muestra uniforme y realmente al azar de todo lo elegido.
    questions = list(questions)
    random.shuffle(questions)
    if count is not None:
        questions = questions[:max(1, count)]

    if not questions:
        raise QuizGenerationError(
            "No hay preguntas disponibles para esa selección."
        )

    quiz = Quiz.objects.create(
        user=user,
        title=title or "Quiz personalizado",
        difficulty=difficulty,
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
    lineup_ids=None,
    question_type: str | None = None,
) -> int:
    """Cantidad de preguntas disponibles para una selección (máximo del quiz)."""
    return available_questions(
        user,
        maps,
        place_ids=place_ids,
        lineup_ids=lineup_ids,
        question_type=question_type,
    ).count()