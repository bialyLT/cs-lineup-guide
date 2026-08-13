from django.core.exceptions import PermissionDenied

from rest_framework import generics

from apps.progression.services import (
    get_unlocked_map_slugs,
    get_unlocked_place_ids,
    is_map_unlocked,
)

from .models import Map, Place
from .serializers import MapSerializer, PlaceDetailSerializer


class MapListView(generics.ListAPIView):
    """GET /api/maps/ → todos los mapas con estado de desbloqueo y sus lugares."""

    serializer_class = MapSerializer
    pagination_class = None

    def get_queryset(self):
        return Map.objects.all()

    def get_serializer_context(self):
        return {
            "context": {
                "unlocked_map_slugs": get_unlocked_map_slugs(self.request.user),
                "unlocked_place_ids": get_unlocked_place_ids(self.request.user),
            },
            "request": self.request,
        }


class PlaceListByMapView(generics.ListAPIView):
    """GET /api/maps/<slug>/places/ → lugares con sus lineups."""

    serializer_class = PlaceDetailSerializer
    pagination_class = None

    def get_queryset(self):
        map_ = Map.objects.filter(slug=self.kwargs["map_slug"]).first()
        if not map_:
            raise PermissionDenied("Mapa no encontrado.")
        if not is_map_unlocked(self.request.user, map_):
            raise PermissionDenied("Este mapa no está desbloqueado.")
        return Place.objects.filter(map=map_.id)

    def get_serializer_context(self):
        return {
            "context": {
                "unlocked_place_ids": get_unlocked_place_ids(self.request.user),
            },
            "request": self.request,
        }