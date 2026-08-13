"""Lógica de desbloqueo y progreso.

La cascada es Mapa → Lugar → Lineup → Pregunta:
- desbloquear un lugar habilita automáticamente sus lineups y preguntas;
- el único candado aparte es el tipo de pregunta (se desbloquea con monedas).
"""
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.maps.models import Map, Place
from apps.quiz.models import Question, QuestionType

from . import constants
from .models import Progression, UserMapUnlock, UserPlaceUnlock, UserQuestionTypeUnlock


class UnlockError(Exception):
    """Error de negocio con un código para la API."""

    def __init__(self, message: str, code: str = "unlock_error"):
        super().__init__(message)
        self.code = code


# ----- Consultas de estado -------------------------------------------------


def get_unlocked_map_slugs(user) -> set[str]:
    return set(UserMapUnlock.objects.filter(user=user).values_list("map__slug", flat=True))


def get_unlocked_place_ids(user) -> set[int]:
    return set(UserPlaceUnlock.objects.filter(user=user).values_list("place_id", flat=True))


def get_unlocked_question_types(user) -> set[str]:
    owned = set(
        UserQuestionTypeUnlock.objects.filter(user=user).values_list(
            "question_type", flat=True
        )
    )
    return owned.union(constants.DEFAULT_FREE_QUESTION_TYPES)


def is_map_unlocked(user, map_: Map) -> bool:
    return map_.is_free or map_.slug in get_unlocked_map_slugs(user)


def is_place_unlocked(user, place: Place) -> bool:
    return place.id in get_unlocked_place_ids(user)


def free_place_used(user) -> bool:
    return UserPlaceUnlock.objects.filter(user=user, via=UserPlaceUnlock.Via.FREE).exists()


def get_or_create_progression(user) -> Progression:
    progression, _ = Progression.objects.get_or_create(user=user)
    return progression


def ensure_starter_place(user) -> Place | None:
    """Garantiza que el usuario tenga al menos un lugar desbloqueado para
    poder generar su primer quiz (el primer lugar del primer mapa gratis).

    Se evita si el usuario ya desbloqueó algún lugar por su cuenta
    (gratuito elegido o pagado con monedas).
    """
    if get_unlocked_place_ids(user):
        return None
    starter = (
        Place.objects.filter(map__is_free=True)
        .order_by("map__order", "order")
        .select_related("map")
        .first()
    )
    if starter is None:
        return None
    UserPlaceUnlock.objects.get_or_create(
        user=user,
        place=starter,
        defaults={"via": UserPlaceUnlock.Via.STARTER},
    )
    return starter


def create_initial_progression(user) -> Progression:
    """Progressión inicial al registrarse. Los tipos gratis se derivan, no se guardan."""
    progression = get_or_create_progression(user)
    ensure_starter_place(user)
    return progression


# ----- Desbloqueos (pago con monedas o lugar gratuito) --------------------


def _spend_coins(progression: Progression, cost: int) -> None:
    if progression.coins < cost:
        raise UnlockError("No tenés suficientes monedas.", code="insufficient_coins")
    progression.coins -= cost
    progression.save(update_fields=["coins"])


@transaction.atomic
def unlock_map(user, map_: Map) -> Progression:
    if map_.is_free:
        return get_or_create_progression(user)
    if is_map_unlocked(user, map_):
        return get_or_create_progression(user)
    progression = get_or_create_progression(user)
    _spend_coins(progression, constants.COIN_COST_MAP)
    UserMapUnlock.objects.create(user=user, map=map_)
    return progression


@transaction.atomic
def unlock_place(user, place: Place, via: str = UserPlaceUnlock.Via.COINS) -> Progression:
    if via == UserPlaceUnlock.Via.FREE:
        # El lugar gratuito es único: se valida antes de permitir repetir/compactar.
        if free_place_used(user):
            raise UnlockError(
                "Ya usaste tu lugar gratuito.", code="free_place_already_used"
            )
        if not is_map_unlocked(user, place.map):
            raise UnlockError("El mapa del lugar no está disponible.", code="map_locked")

    if is_place_unlocked(user, place):
        return get_or_create_progression(user)

    progression = get_or_create_progression(user)
    if via == UserPlaceUnlock.Via.COINS:
        _spend_coins(progression, constants.COIN_COST_PLACE)

    UserPlaceUnlock.objects.create(user=user, place=place, via=via)
    return progression


@transaction.atomic
def unlock_question_type(user, question_type: QuestionType) -> Progression:
    question_type = QuestionType(question_type)  # valida el valor
    if question_type.value in get_unlocked_question_types(user):
        return get_or_create_progression(user)

    progression = get_or_create_progression(user)
    _spend_coins(progression, constants.COIN_COST_QUESTION_TYPE)
    UserQuestionTypeUnlock.objects.create(user=user, question_type=question_type.value)
    return progression


# ----- Preguntas disponibles y generación de quizzes ----------------------

def available_questions(user, maps) -> "models.QuerySet[Question]":
    """Preguntas de los lineups de lugares desbloqueados, con tipos habilitados."""
    place_ids = get_unlocked_place_ids(user)
    types = get_unlocked_question_types(user)
    return Question.objects.filter(
        map__in=maps,
        lineup__place_id__in=place_ids,
        type__in=types,
    ).select_related("lineup__place", "map")


# ----- Respuestas (solo contadores) ----------------------------------------

def record_answer(user, correct: bool, progression: Progression | None = None) -> Progression:
    progression = progression or get_or_create_progression(user)
    now = timezone.now()

    if not correct:
        progression.streak = 0
        progression.save(update_fields=["streak"])
        return progression

    if (
        progression.last_streak_at
        and now - progression.last_streak_at <= timedelta(hours=constants.STREAK_WINDOW_HOURS)
    ):
        progression.streak += 1
    else:
        progression.streak = 1

    progression.best_streak = max(progression.best_streak, progression.streak)
    progression.xp += constants.XP_PER_CORRECT
    progression.coins += constants.COINS_PER_CORRECT
    progression.last_streak_at = now
    progression.save(
        update_fields=[
            "streak",
            "best_streak",
            "xp",
            "coins",
            "last_streak_at",
        ]
    )
    return progression