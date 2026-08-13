from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import UserSerializer
from apps.maps.models import Map, Place
from apps.quiz.models import QuestionType

from . import constants
from .models import Progression, UserPlaceUnlock
from .serializers import ProgressionSerializer
from .services import (
    UnlockError,
    free_place_used,
    get_or_create_progression,
    get_unlocked_map_slugs,
    get_unlocked_place_ids,
    get_unlocked_question_types,
    is_map_unlocked,
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
            "question_types": sorted(get_unlocked_question_types(user)),
            "free_question_types": constants.DEFAULT_FREE_QUESTION_TYPES,
            "free_place_used": free_place_used(user),
        },
    }


class MeView(APIView):
    """GET /api/me/ → usuario + contadores + desbloqueos."""

    def get(self, request):
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
    """POST /api/me/unlock/  { kind: "map"|"place"|"question_type", id }"""

    def post(self, request):
        kind = request.data.get("kind")
        identifier = request.data.get("id")

        try:
            if kind == "map":
                map_ = Map.objects.get(slug=identifier)
                unlock_map(request.user, map_)
            elif kind == "place":
                place = Place.objects.get(pk=identifier)
                unlock_place(request.user, place, via=UserPlaceUnlock.Via.COINS)
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