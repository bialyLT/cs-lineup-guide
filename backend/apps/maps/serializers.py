from rest_framework import serializers

from .models import Lineup, Map, Place


class PlaceSerializer(serializers.ModelSerializer):
    map = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    position = serializers.SerializerMethodField()
    unlocked = serializers.SerializerMethodField()

    class Meta:
        model = Place
        fields = ["id", "map", "name", "position", "unlocked"]

    def get_position(self, obj: Place):
        if obj.position_x is None or obj.position_y is None:
            return None
        return {"x": float(obj.position_x), "y": float(obj.position_y)}

    def get_unlocked(self, obj: Place) -> bool:
        context = self.context.get("context", {})
        unlocked_place_ids = context.get("unlocked_place_ids", set())
        return obj.id in unlocked_place_ids


class LineupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lineup
        fields = ["id", "place", "title", "util", "description"]


class MapSerializer(serializers.ModelSerializer):
    # El id que consume el frontend es el slug ("mirage", "inferno", ...).
    id = serializers.CharField(source="slug", read_only=True)
    unlocked = serializers.SerializerMethodField()
    places = PlaceSerializer(many=True, read_only=True)

    class Meta:
        model = Map
        fields = ["id", "name", "image_url", "is_free", "unlocked", "places"]
        read_only_fields = fields

    def get_unlocked(self, obj: Map) -> bool:
        context = self.context.get("context", {})
        unlocked_map_slugs = context.get("unlocked_map_slugs", set())
        return obj.is_free or obj.slug in unlocked_map_slugs


class PlaceDetailSerializer(PlaceSerializer):
    """Lugar con sus lineups (para la pantalla de mapa)."""

    lineups = LineupSerializer(many=True, read_only=True)

    class Meta(PlaceSerializer.Meta):
        fields = [*PlaceSerializer.Meta.fields, "lineups"]