"""Lógica de desbloqueo y progreso.

La cascada es Mapa → Lugar → Lineup → Pregunta:
- desbloquear un mapa habilita sus lugares; cada lugar se desbloquea aparte;
- cada lineup se desbloquea por separado (no lo habilita el lugar);
- el único candado aparte es el tipo de pregunta (se desbloquea con monedas).
"""
import json
from datetime import timedelta

from django.db import models, transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.maps.models import Lineup, Map, Place
from apps.quiz.models import Question, QuestionType

from . import constants
from .models import (
    Progression,
    QuestionTypeConfig,
    UserLineupUnlock,
    UserMapUnlock,
    UserPlaceUnlock,
    UserQuestionTypeUnlock,
    VideoRewardClaim,
    VideoRewardConfig,
)


class UnlockError(Exception):
    """Error de negocio con un código para la API."""

    def __init__(self, message: str, code: str = "unlock_error"):
        super().__init__(message)
        self.code = code


# ----- Nivel y configuración de tipos --------------------------------------

def user_level(user) -> int:
    """Nivel del usuario, derivado de la XP (espejo de src/lib/xp.ts)."""
    progression = get_or_create_progression(user)
    return progression.xp // constants.XP_PER_LEVEL + 1


def _parse_utility_levels(text: str) -> dict[str, int]:
    """`utility_levels` de la config (JSON) → {utilidad: nivel}. Robusto ante
    texto vacío o inválido: ante el mínimo error queda vacío."""
    if not text:
        return {}
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return {}
    if not isinstance(data, dict):
        return {}
    return {str(k): int(v) for k, v in data.items() if str(v).isdigit()}


def get_question_type_configs() -> list[QuestionTypeConfig]:
    """Configuración de tipos de pregunta en orden de visualización."""
    return list(QuestionTypeConfig.objects.all())


def get_free_question_types() -> list[str]:
    """Tipos desbloqueados desde el inicio (unlock_level == 0)."""
    return [
        config.question_type
        for config in get_question_type_configs()
        if config.unlock_level == 0
    ]


def get_unlocked_utilities(user) -> set[str]:
    """Utilidades desbloqueadas por nivel, según la config del tipo utility
    (smoke=2, molotov=3, flash=4, he=5, decoy=6)."""
    level = user_level(user)
    config = QuestionTypeConfig.objects.filter(
        question_type=QuestionType.UTILITY.value
    ).first()
    levels = _parse_utility_levels(config.utility_levels if config else "")
    return {util for util, util_level in levels.items() if level >= util_level}


# ----- Consultas de estado -------------------------------------------------


def get_unlocked_map_slugs(user) -> set[str]:
    return set(UserMapUnlock.objects.filter(user=user).values_list("map__slug", flat=True))


def get_unlocked_place_ids(user) -> set[int]:
    return set(UserPlaceUnlock.objects.filter(user=user).values_list("place_id", flat=True))


def get_unlocked_lineup_ids(user) -> set[int]:
    return set(
        UserLineupUnlock.objects.filter(user=user).values_list("lineup_id", flat=True)
    )


def unlocked_places_per_map(user) -> dict[int, int]:
    """map_id → cantidad de lugares desbloqueados por el usuario (una consulta)."""
    rows = (
        UserPlaceUnlock.objects.filter(user=user)
        .values("place__map_id")
        .annotate(count=Count("place_id"))
    )
    return {row["place__map_id"]: row["count"] for row in rows}


def get_unlocked_question_types(user) -> set[str]:
    """Tipos disponibles para el usuario: los desbloqueados por nivel
    (config, incluidos los de nivel 0) más los comprados con monedas."""
    owned = set(
        UserQuestionTypeUnlock.objects.filter(user=user).values_list(
            "question_type", flat=True
        )
    )
    level = user_level(user)
    by_level = {
        config.question_type
        for config in get_question_type_configs()
        if config.unlock_level is not None and config.unlock_level <= level
    }
    return by_level.union(owned)


def is_map_unlocked(user, map_: Map) -> bool:
    return map_.is_free or map_.slug in get_unlocked_map_slugs(user)


def is_place_unlocked(user, place: Place) -> bool:
    return place.id in get_unlocked_place_ids(user)


def free_place_used(user) -> bool:
    return UserPlaceUnlock.objects.filter(user=user, via=UserPlaceUnlock.Via.FREE).exists()


def place_unlock_cost(place: Place, unlocked_in_map: int = 0) -> int:
    """Costo de desbloquear un lugar: progresivo según cuántos lugares del
    mismo mapa ya desbloqueó el usuario. El primero cuesta el base y cada
    lugar adicional suma un step (independiente del campo `order`)."""
    return constants.COIN_COST_PLACE_BASE + unlocked_in_map * constants.COIN_COST_PLACE_STEP


def starter_places_count(user) -> int:
    """Cantidad de lugares iniciales ya elegidos (cupo usado del onboarding)."""
    return UserPlaceUnlock.objects.filter(
        user=user, via=UserPlaceUnlock.Via.STARTER
    ).count()


def remaining_starter_places(user) -> int:
    """Cuántos lugares iniciales le quedan al usuario (hasta STARTER_PLACE_COUNT)."""
    return max(0, constants.STARTER_PLACE_COUNT - starter_places_count(user))


def starter_places_selected(user) -> bool:
    """True si el usuario ya eligió sus lugares iniciales (onboarding hecho)."""
    return starter_places_count(user) > 0


def get_or_create_progression(user) -> Progression:
    progression, _ = Progression.objects.get_or_create(user=user)
    return progression


def create_initial_progression(user) -> Progression:
    """Progresión inicial al registrarse. El onboarding de lugares es aparte."""
    return get_or_create_progression(user)


# ----- Onboarding: elección de los primeros lugares -----------------------


@transaction.atomic
def select_starter_places(user, place_ids) -> Progression:
    """Suma lugares iniciales al usuario (hasta STARTER_PLACE_COUNT).

    Se puede llamar de nuevo para completar la elección: suma lugares que
    falten (mapas gratuitos), respetando el cupo total y sin repetir los que
    el usuario ya tiene desbloqueados (por starter, monedas o gratis).
    """
    if not isinstance(place_ids, (list, tuple)) or not place_ids:
        raise UnlockError("Elegí al menos un lugar para empezar.", code="invalid_places")

    try:
        unique = list(dict.fromkeys(int(pk) for pk in place_ids))
    except (TypeError, ValueError):
        raise UnlockError("Lugares inválidos.", code="invalid_places")

    free_slots = remaining_starter_places(user)
    if free_slots <= 0:
        raise UnlockError(
            "Ya usaste todos tus lugares iniciales.", code="starter_already_selected"
        )

    places = list(Place.objects.filter(pk__in=unique, map__is_free=True))
    if len(places) != len(unique):
        raise UnlockError(
            "Alguno de los lugares no está disponible para empezar.",
            code="invalid_places",
        )

    already = get_unlocked_place_ids(user)
    new_places = [place for place in places if place.id not in already]
    if len(new_places) > free_slots:
        raise UnlockError(
            f"Podés elegir hasta {constants.STARTER_PLACE_COUNT} lugares iniciales en total.",
            code="too_many_places",
        )
    if not new_places:
        return get_or_create_progression(user)

    progression = get_or_create_progression(user)
    UserPlaceUnlock.objects.bulk_create(
        UserPlaceUnlock(user=user, place=place, via=UserPlaceUnlock.Via.STARTER)
        for place in new_places
    )
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
    # Cascada Mapa → Lugar: no se puede desbloquear un lugar de un mapa cerrado.
    if not is_map_unlocked(user, place.map):
        raise UnlockError("El mapa del lugar no está desbloqueado.", code="map_locked")

    if via == UserPlaceUnlock.Via.FREE:
        # El lugar gratuito es único: se valida antes de permitir repetir/compactar.
        if free_place_used(user):
            raise UnlockError(
                "Ya usaste tu lugar gratuito.", code="free_place_already_used"
            )

    if via == UserPlaceUnlock.Via.STARTER:
        if remaining_starter_places(user) <= 0:
            raise UnlockError(
                "No te quedan lugares iniciales disponibles.",
                code="no_starter_places_left",
            )

    if is_place_unlocked(user, place):
        return get_or_create_progression(user)

    progression = get_or_create_progression(user)
    if via == UserPlaceUnlock.Via.COINS:
        unlocked_in_map = UserPlaceUnlock.objects.filter(
            user=user, place__map=place.map
        ).count()
        _spend_coins(progression, place_unlock_cost(place, unlocked_in_map))

    UserPlaceUnlock.objects.create(user=user, place=place, via=via)
    return progression


def lineup_unlock_cost() -> int:
    """Costo de desbloquear un lineup (plano, independiente del lugar)."""
    return constants.COIN_COST_LINEUP


@transaction.atomic
def unlock_lineup(user, lineup: Lineup) -> Progression:
    """Desbloquea un lineup con monedas. Requiere el mapa desbloqueado."""
    if lineup.id in get_unlocked_lineup_ids(user):
        return get_or_create_progression(user)
    if not is_map_unlocked(user, lineup.place.map):
        raise UnlockError(
            "El mapa del lineup no está desbloqueado.", code="map_locked"
        )
    progression = get_or_create_progression(user)
    _spend_coins(progression, constants.COIN_COST_LINEUP)
    UserLineupUnlock.objects.create(user=user, lineup=lineup)
    return progression


@transaction.atomic
def unlock_question_type(user, question_type: QuestionType) -> Progression:
    question_type = QuestionType(question_type)  # valida el valor
    # Un tipo con nivel configurado se desbloquea por nivel, no con monedas.
    config = QuestionTypeConfig.objects.filter(
        question_type=question_type.value
    ).first()
    if config and config.unlock_level is not None:
        raise UnlockError(
            "Este tipo de pregunta se desbloquea por nivel, no con monedas.",
            code="question_type_by_level",
        )
    if question_type.value in get_unlocked_question_types(user):
        return get_or_create_progression(user)

    progression = get_or_create_progression(user)
    _spend_coins(progression, constants.COIN_COST_QUESTION_TYPE)
    UserQuestionTypeUnlock.objects.create(user=user, question_type=question_type.value)
    return progression


# ----- Preguntas disponibles y generación de quizzes ----------------------

def available_questions(
    user,
    maps,
    places_only: bool = False,
    place_ids=None,
    lineup_ids=None,
    question_type: str | None = None,
) -> "models.QuerySet[Question]":
    """Preguntas disponibles según desbloqueos y filtros de selección.

    Con `places_only=True` (primer quiz del usuario) se devuelven SOLO las
    preguntas de lugar (map_location) de los lugares desbloqueados, para que
    el primer quiz enseñe dónde están los lugares elegidos.

    Con `place_ids` se acota a las preguntas de esos lugares (se cruza con los
    desbloqueados). Con `lineup_ids` se acota a las preguntas de esos lineups
    (se cruza con los desbloqueados). Con `question_type` se filtra a un tipo.

    Reglas de desbloqueo (los mapas ya llegan como accesibles):
    - pregunta con lineup → requiere el lineup desbloqueado; si es de tipo
      "utility" además requiere la utilidad del lineup desbloqueada por nivel;
    - pregunta de lugar (sin lineup) → requiere el lugar desbloqueado;
    - pregunta de mapa (sin lineup ni lugar) → solo requiere el mapa accesible.
    """
    unlocked = get_unlocked_place_ids(user)
    unlocked_lineups = get_unlocked_lineup_ids(user)
    unlocked_utils = get_unlocked_utilities(user)
    types = [question_type] if question_type else get_unlocked_question_types(user)

    if places_only:
        scope = place_ids if place_ids is not None else unlocked
        return (
            Question.objects.filter(
                map__in=maps,
                type=QuestionType.MAP_LOCATION,
                place_id__in=scope,
            ).select_related("map", "place")
        )

    base = Question.objects.filter(map__in=maps, type__in=types)

    def lineup_ok(lineup_ids) -> Q:
        """Preguntas de lineups desbloqueados; las de utilidad además exigen la
        utilidad desbloqueada por nivel."""
        return Q(lineup_id__in=lineup_ids) & (
            ~Q(type=QuestionType.UTILITY.value)
            | Q(lineup__util__in=unlocked_utils)
        )

    if place_ids is not None and lineup_ids is not None:
        # Líneas elegidas + preguntas de lugar (sin lineup) de los lugares elegidos.
        scope = set(place_ids) & unlocked
        lineup_scope = set(lineup_ids) & unlocked_lineups
        return base.filter(
            lineup_ok(lineup_scope) | Q(lineup__isnull=True, place_id__in=scope)
        ).select_related("map", "lineup__place", "place")

    if place_ids is not None:
        # Todos los lineups desbloqueados dentro de los lugares elegidos.
        scope = set(place_ids) & unlocked
        return base.filter(
            (lineup_ok(unlocked_lineups) & Q(lineup__place_id__in=scope))
            | Q(lineup__isnull=True, place_id__in=scope)
        ).select_related("map", "lineup__place", "place")

    if lineup_ids is not None:
        # Solo las preguntas de los lineups elegidos (desbloqueados).
        lineup_scope = set(lineup_ids) & unlocked_lineups
        return base.filter(lineup_ok(lineup_scope)).select_related(
            "map", "lineup__place", "place"
        )

    return base.filter(
        Q(lineup__isnull=True, place__isnull=True)
        | lineup_ok(unlocked_lineups)
        | Q(lineup__isnull=True, place_id__in=unlocked)
    ).select_related("map", "lineup__place", "place")


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


# ----- Recompensa por ver un video -----------------------------------------

def video_reward_status(user) -> dict:
    """Estado del reward por video: si está habilitado, las monedas, el
    cooldown y si el usuario ya puede reclamar."""
    config = VideoRewardConfig.get_solo()
    last_claim = (
        VideoRewardClaim.objects.filter(user=user).order_by("-claimed_at").first()
    )
    next_claim_at = None
    if last_claim:
        next_claim_at = last_claim.claimed_at + timedelta(hours=config.cooldown_hours)
    now = timezone.now()
    return {
        "enabled": config.enabled,
        "coins": config.coins,
        "cooldown_hours": config.cooldown_hours,
        "video_url": config.video_url,
        "eligible": config.enabled and (next_claim_at is None or now >= next_claim_at),
        "next_claim_at": next_claim_at.isoformat() if next_claim_at else None,
    }


def claim_video_reward(user) -> Progression:
    """Acredita las monedas del reward por video. Valida el cooldown y el estado
    server-side; el lock en la fila de progression serializa claims concurrentes."""
    config = VideoRewardConfig.get_solo()
    if not config.enabled:
        raise UnlockError(
            "El reward por video está deshabilitado.", code="video_reward_disabled"
        )

    now = timezone.now()
    with transaction.atomic():
        progression = get_or_create_progression(user)
        progression = Progression.objects.select_for_update().get(pk=progression.pk)
        last_claim = (
            VideoRewardClaim.objects.filter(user=user).order_by("-claimed_at").first()
        )
        if last_claim:
            cooldown = last_claim.claimed_at + timedelta(hours=config.cooldown_hours)
            if now < cooldown:
                raise UnlockError(
                    "Ya reclamaste recientemente.",
                    code="video_reward_cooldown",
                )
        progression.coins += config.coins
        progression.save(update_fields=["coins"])
        VideoRewardClaim.objects.create(user=user, claimed_at=now)
    return progression