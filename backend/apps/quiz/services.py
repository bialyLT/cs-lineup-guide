"""Generación de quizzes a partir del contenido desbloqueado del usuario."""
import random

from django.db import transaction
from django.utils import timezone

from apps.maps.models import Map, Place
from apps.progression.services import available_questions

from .models import (
    Option,
    Question,
    QuestionType,
    Quiz,
    QuizAnswer,
    QuizConfig,
    QuizQuestion,
)

MAP_LOCATION_PROMPT_PREFIX = "Marcá en el mapa dónde está"
MAP_LOCATION_HELPER = "Elegí en el mapa el lugar que se indica."


def sync_map_location_questions(map_: Map) -> None:
    """Histórico: antes generaba una pregunta de lugar (map_location) por sitio.

    Hoy las preguntas de lugar se modelan con ``map_area`` (una sola por lugar,
    validada por radio), así que este sync quedó inactivo para no duplicar el
    mismo lugar en los quizzes. Se mantiene la firma por compatibilidad con las
    señales del panel de administración.
    """
    return


MAP_AREA_PROMPT_PREFIX = "¿Dónde está"
MAP_AREA_HELPER = "Tocá sobre el mapa la zona donde está el lugar."


def sync_map_area_questions(map_: Map) -> None:
    """Garantiza la pregunta de zona (map_area) de cada lugar del mapa.

    A diferencia de ``map_location`` (elegir el punto entre candidatos), en
    ``map_area`` el usuario toca libremente el mapa y se evalúa por proximidad
    al marcador del lugar (dentro de su ``hit_radius``). No tiene opciones:
    la respuesta es una coordenada.
    """
    places = list(
        map_.places.filter(
            position_x__isnull=False, position_y__isnull=False
        ).order_by("order")
    )
    if len(places) < 2 or not map_.image_url:
        return

    for place in places:
        prompt = f"{MAP_AREA_PROMPT_PREFIX} {place.name}?"
        question, _ = Question.objects.get_or_create(
            map=map_,
            type=QuestionType.MAP_AREA,
            place=place,
            defaults={
                "prompt": prompt,
                "helper_text": MAP_AREA_HELPER,
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


class QuizGenerationError(Exception):
    code = "quiz_generation_error"


# Días tras un acierto tras los cuales la pregunta vuelve a tener prioridad.
RECENT_CORRECT_DAYS = 3


def _build_answer_history(user) -> dict[int, tuple[bool, object]]:
    """Último resultado (correcto, fecha) por pregunta para ese usuario.

    Solo nos importa la respuesta más reciente de cada pregunta para aplicar
    repetición espaciada: lo que se acertó hace poco se evita; lo que se falló
    o no se vio nunca se favorece.
    """
    history: dict[int, tuple[bool, object]] = {}
    rows = (
        QuizAnswer.objects.filter(quiz_question__quiz__user=user)
        .order_by("quiz_question__question_id", "-answered_at")
        .values_list("quiz_question__question_id", "is_correct", "answered_at")
    )
    for question_id, correct, answered_at in rows:
        if question_id not in history:
            history[question_id] = (correct, answered_at)
    return history


def _weight_for(question_id: int, history: dict[int, tuple[bool, object]]) -> float:
    """Peso de selección: más alto = más probabilidad de caer en el quiz."""
    info = history.get(question_id)
    if info is None:
        return 100.0  # nunca vista: prioridad máxima
    correct, answered_at = info
    age_days = (timezone.now() - answered_at).days
    if not correct:
        return 55.0  # fallada recientemente: conviene repasarla
    if age_days <= RECENT_CORRECT_DAYS:
        return 4.0  # acertada hace poco: evitar repetir
    return 22.0  # acertada hace tiempo: refrescar


def _interleave_by_type(questions: list) -> list:
    """Reordena para alternar tipos y que no salgan 3 iguales seguidas.

    Solo aplica cuando la selección tiene más de un tipo; si el usuario eligió
    un único tipo (o el muestreo solo trajo uno) se devuelve igual, sin romper.
    """
    types = {q.type for q in questions}
    if len(types) < 2:
        return questions
    groups: dict[str, list] = {}
    for question in questions:
        groups.setdefault(question.type, []).append(question)
    order: list = []
    keys = list(groups.keys())
    while True:
        added = False
        for key in keys:
            bucket = groups[key]
            if bucket:
                order.append(bucket.pop(0))
                added = True
        if not added:
            break
    return order


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

    pool = available_questions(
        user,
        maps,
        places_only=places_only,
        place_ids=place_ids,
        lineup_ids=lineup_ids,
        question_type=question_type,
    )
    questions = list(pool)

    # Repetición espaciada: ordenamos todo el pool por un peso que favorece las
    # preguntas no vistas o falladas y relega las acertadas hace poco. Con pesos
    # iguales (p.ej. usuario nuevo) esto equivale a un shuffle uniforme.
    history = _build_answer_history(user)
    weighted = sorted(
        questions,
        key=lambda q: random.random() ** (1.0 / _weight_for(q.id, history)),
        reverse=True,
    )
    # Recortamos DESPUÉS de ordenar: así el subconjunto es una muestra sesgada
    # hacia lo conveniente, no un bloque agrupado por mapa/lugar/lineup.
    if count is not None:
        weighted = weighted[:max(1, count)]

    # Entremezclamos tipos solo si hay más de uno en la selección.
    questions = _interleave_by_type(weighted)

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