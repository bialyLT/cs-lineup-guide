from django.core.exceptions import PermissionDenied

from rest_framework import generics

from apps.progression.services import (
    get_unlocked_lineup_ids,
    get_unlocked_map_slugs,
    get_unlocked_place_ids,
    unlocked_places_per_map,
)

from .models import Lineup, Map, Place
from .serializers import (
    LineupDetailSerializer,
    MapSerializer,
    PlaceDetailSerializer,
)


class MapListView(generics.ListAPIView):
    """GET /api/maps/ → todos los mapas con estado de desbloqueo y sus lugares."""

    serializer_class = MapSerializer
    pagination_class = None

    def get_queryset(self):
        return Map.objects.prefetch_related(
            "places__lineups__questions", "places__lineups__images"
        ).all()

    def get_serializer_context(self):
        return {
            "context": {
                "unlocked_map_slugs": get_unlocked_map_slugs(self.request.user),
                "unlocked_place_ids": get_unlocked_place_ids(self.request.user),
                "unlocked_lineup_ids": get_unlocked_lineup_ids(self.request.user),
                "unlocked_places_per_map": unlocked_places_per_map(self.request.user),
            },
            "request": self.request,
        }


class PlaceListByMapView(generics.ListAPIView):
    """GET /api/maps/<slug>/places/ → lugares con sus lineups.

    Devuelve la estructura completa (aunque el mapa esté bloqueado, así el
    usuario ve qué puede desbloquear). El estado de cada lugar viene en
    `unlocked` del serializer.
    """

    serializer_class = PlaceDetailSerializer
    pagination_class = None

    def get_queryset(self):
        map_ = Map.objects.filter(slug=self.kwargs["map_slug"]).first()
        if not map_:
            raise PermissionDenied("Mapa no encontrado.")
        return (
            Place.objects.select_related("map")
            .prefetch_related("lineups__questions", "lineups__images")
            .filter(map=map_.id)
        )

    def get_serializer_context(self):
        return {
            "context": {
                "unlocked_place_ids": get_unlocked_place_ids(self.request.user),
                "unlocked_lineup_ids": get_unlocked_lineup_ids(self.request.user),
                "unlocked_places_per_map": unlocked_places_per_map(self.request.user),
            },
            "request": self.request,
        }


class LineupDetailView(generics.GenericAPIView):
    """GET /api/lineups/<pk>/ → detalle de un lineup YA DESBLOQUEADO.

    Si el lineup no está desbloqueado para el usuario, responde 403 (el
    contenido —imágenes y descripción— no se sirve nunca a usuarios bloqueados).
    """

    serializer_class = LineupDetailSerializer

    def get(self, request, pk: int):
        lineup = (
            Lineup.objects.filter(pk=pk)
            .select_related("place__map")
            .prefetch_related("images", "questions")
            .first()
        )
        if not lineup:
            raise PermissionDenied("Lineup no encontrado.")

        unlocked_lineup_ids = get_unlocked_lineup_ids(request.user)
        if lineup.id not in unlocked_lineup_ids:
            raise PermissionDenied("Este lineup está bloqueado.")

        serializer = self.get_serializer(
            lineup,
            context={"context": {"unlocked_lineup_ids": unlocked_lineup_ids}},
        )
        return Response(serializer.data)