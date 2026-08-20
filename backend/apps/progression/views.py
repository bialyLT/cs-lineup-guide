from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import UserSerializer
from apps.maps.models import Lineup, Map, Place
from apps.quiz.models import QuestionType

from . import constants
from .models import Progression, UserPlaceUnlock
from .serializers import ProgressionSerializer
from .services import (
    UnlockError,
    free_place_used,
    get_free_question_types,
    get_or_create_progression,
    get_question_type_configs,
    get_unlocked_lineup_ids,
    get_unlocked_map_slugs,
    get_unlocked_place_ids,
    get_unlocked_question_types,
    get_unlocked_utilities,
    is_map_unlocked,
    remaining_starter_places,
    select_starter_places,
    starter_places_selected,
    unlock_lineup,
    unlock_map,
    unlock_place,
    unlock_question_type,
)


def me_payload(user) -> dict:
    progression = get_or_create_progression(user)
    return {
        "user": UserSerializer(user).data,
        "progression": ProgressionSerializer(progression).data,
        "unlocked": {
            "maps": sorted(get_unlocked_map_slugs(user)),
            "places": sorted(get_unlocked_place_ids(user)),
            "lineups": sorted(get_unlocked_lineup_ids(user)),
            "utilities": sorted(get_unlocked_utilities(user)),
            "question_types": sorted(get_unlocked_question_types(user)),
            "free_question_types": get_free_question_types(),
            "question_type_configs": [
                {
                    "question_type": config.question_type,
                    "label": config.label,
                    "unlock_level": config.unlock_level,
                    "order": config.order,
                    "utility_levels": config.utility_levels,
                }
                for config in get_question_type_configs()
            ],
            "free_place_used": free_place_used(user),
            "starter_places_selected": starter_places_selected(user),
            "remaining_starter_places": remaining_starter_places(user),
        },
        "costs": {
            "map": constants.COIN_COST_MAP,
            "place_base": constants.COIN_COST_PLACE_BASE,
            "place_step": constants.COIN_COST_PLACE_STEP,
            "lineup": constants.COIN_COST_LINEUP,
            "question_type": constants.COIN_COST_QUESTION_TYPE,
        },
    }


class MeView(APIView):
    """GET /api/me/ → usuario + contadores + desbloqueos.

    Accesible para usuarios sin verificar (solo IsAuthenticated) para que la
    app sepa que la cuenta está pendiente; el resto de endpoints exigen
    email verificado (permiso por defecto IsVerifiedUser).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(me_payload(request.user))


class StarterPlacesView(APIView):
    """POST /api/me/starter-places/  { place_ids: [int, ...] }

    Elección única de los primeros lugares (mapas gratuitos). El resto de
    lugares se desbloquea con monedas.
    """

    def post(self, request):
        place_ids = request.data.get("place_ids")
        if not isinstance(place_ids, list):
            return Response(
                {"detail": "place_ids debe ser una lista de lugares."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            select_starter_places(request.user, place_ids)
        except UnlockError as exc:
            return Response(
                {"detail": str(exc), "code": exc.code},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(me_payload(request.user))


class FreePlaceView(APIView):
    """POST /api/me/free-place/  { place_id } → desbloqueo gratuito único."""

    def post(self, request):
        place = Place.objects.filter(pk=request.data.get("place_id")).first()
        if not place:
            return Response(
                {"detail": "Lugar no encontrado."}, status=status.HTTP_404_NOT_FOUND
            )
        if not is_map_unlocked(request.user, place.map):
            return Response(
                {"detail": "El mapa del lugar no está disponible."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            unlock_place(request.user, place, via=UserPlaceUnlock.Via.FREE)
        except UnlockError as exc:
            return Response(
                {"detail": str(exc), "code": exc.code},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(me_payload(request.user))


class UnlockView(APIView):
    """POST /api/me/unlock/  { kind: "map"|"place"|"lineup"|"question_type", id }

    Para kind="place", `via` opcional: "coins" (default), "starter" (usar un
    lugar inicial disponible) o "free" (el lugar gratuito único).
    """

    def post(self, request):
        kind = request.data.get("kind")
        identifier = request.data.get("id")
        via = request.data.get("via") or UserPlaceUnlock.Via.COINS

        try:
            if kind == "map":
                map_ = Map.objects.get(slug=identifier)
                unlock_map(request.user, map_)
            elif kind == "place":
                if via not in UserPlaceUnlock.Via.values:
                    return Response(
                        {"detail": "Vía de desbloqueo inválida."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                place = Place.objects.get(pk=identifier)
                unlock_place(request.user, place, via=via)
            elif kind == "lineup":
                lineup = Lineup.objects.get(pk=identifier)
                unlock_lineup(request.user, lineup)
            elif kind == "question_type":
                unlock_question_type(request.user, QuestionType(identifier))
            else:
                return Response(
                    {"detail": "Tipo de desbloqueo inválido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Map.DoesNotExist:
            return Response(
                {"detail": "Mapa no encontrado."}, status=status.HTTP_404_NOT_FOUND
            )
        except Place.DoesNotExist:
            return Response(
                {"detail": "Lugar no encontrado."}, status=status.HTTP_404_NOT_FOUND
            )
        except Lineup.DoesNotExist:
            return Response(
                {"detail": "Lineup no encontrado."}, status=status.HTTP_404_NOT_FOUND
            )
        except ValueError:
            return Response(
                {"detail": "Tipo de pregunta inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except UnlockError as exc:
            return Response(
                {"detail": str(exc), "code": exc.code},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(me_payload(request.user))


class RankingView(APIView):
    """GET /api/ranking/ → top por experiencia + posición del usuario."""

    def get(self, request):
        rows = Progression.objects.select_related("user").order_by("-xp")

        entries = [
            {
                "rank": index + 1,
                "user_id": row.user.id,
                "username": row.user.username,
                "display_name": row.user.display_name,
                "xp": row.xp,
            }
            for index, row in enumerate(rows)
        ]

        position_by_user = {entry["user_id"]: entry["rank"] for entry in entries}
        me = get_or_create_progression(request.user)

        return Response(
            {
                "entries": entries[:10],
                "you": {
                    "user_id": request.user.id,
                    "username": request.user.username,
                    "display_name": request.user.display_name,
                    "rank": position_by_user.get(request.user.id, 0),
                    "xp": me.xp,
                },
            }
        )