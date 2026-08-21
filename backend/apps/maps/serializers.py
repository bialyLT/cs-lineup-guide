from rest_framework import serializers

from .models import Lineup, Map, Place


class PlaceSerializer(serializers.ModelSerializer):
    map = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    position = serializers.SerializerMethodField()
    unlocked = serializers.SerializerMethodField()
    unlock_cost = serializers.SerializerMethodField()

    class Meta:
        model = Place
        fields = ["id", "map", "name", "position", "unlocked", "unlock_cost"]

    def get_position(self, obj: Place):
        if obj.position_x is None or obj.position_y is None:
            return None
        return {"x": float(obj.position_x), "y": float(obj.position_y)}

    def get_unlocked(self, obj: Place) -> bool:
        context = self.context.get("context", {})
        unlocked_place_ids = context.get("unlocked_place_ids", set())
        return obj.id in unlocked_place_ids

    def get_unlock_cost(self, obj: Place) -> int:
        from apps.progression.services import place_unlock_cost

        context = self.context.get("context", {})
        counts = context.get("unlocked_places_per_map", {})
        return place_unlock_cost(obj, counts.get(obj.map_id, 0))


class LineupSerializer(serializers.ModelSerializer):
    unlocked = serializers.SerializerMethodField()
    unlock_cost = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()

    class Meta:
        model = Lineup
        fields = [
            "id",
            "place",
            "title",
            "util",
            "description",
            "unlocked",
            "unlock_cost",
            "question_count",
            "images",
        ]

    def get_unlocked(self, obj: Lineup) -> bool:
        context = self.context.get("context", {})
        unlocked_lineup_ids = context.get("unlocked_lineup_ids", set())
        return obj.id in unlocked_lineup_ids

    def get_unlock_cost(self, obj: Lineup) -> int:
        from apps.progression import constants

        context = self.context.get("context", {})
        unlocked_lineup_ids = context.get("unlocked_lineup_ids", set())
        return 0 if obj.id in unlocked_lineup_ids else constants.COIN_COST_LINEUP

    def get_question_count(self, obj: Lineup) -> int:
        # Con prefetch_related("questions") usa la cache, sin consulta extra.
        return len(obj.questions.all())

    def get_images(self, obj: Lineup):
        # Con prefetch_related("images") usa la cache, sin consulta extra.
        return [image.image_url for image in obj.images.all()]


class LineupDetailSerializer(serializers.ModelSerializer):
    """Detalle de un lineup ya desbloqueado (vista propia del lineup).

    Incluye el mapa y el lugar para armar la navegación de vuelta, y las
    imágenes referenciadas. El acceso está protegido por la vista: solo se
    sirve si el usuario lo tiene desbloqueado.
    """

    unlocked = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()
    map_slug = serializers.SerializerMethodField()
    map_name = serializers.SerializerMethodField()
    place_name = serializers.SerializerMethodField()

    class Meta:
        model = Lineup
        fields = [
            "id",
            "title",
            "util",
            "description",
            "unlocked",
            "images",
            "question_count",
            "map_slug",
            "map_name",
            "place_name",
        ]
        read_only_fields = fields

    def get_unlocked(self, obj: Lineup) -> bool:
        context = self.context.get("context", {})
        return obj.id in context.get("unlocked_lineup_ids", set())

    def get_images(self, obj: Lineup):
        return [image.image_url for image in obj.images.all()]

    def get_question_count(self, obj: Lineup) -> int:
        return len(obj.questions.all())

    def get_map_slug(self, obj: Lineup) -> str:
        return obj.place.map.slug

    def get_map_name(self, obj: Lineup) -> str:
        return obj.place.map.name

    def get_place_name(self, obj: Lineup) -> str:
        return obj.place.name


class PlaceDetailSerializer(PlaceSerializer):
    """Lugar con sus lineups (para la pantalla de mapa y el listado de mapas)."""

    lineups = LineupSerializer(many=True, read_only=True)

    class Meta(PlaceSerializer.Meta):
        fields = [*PlaceSerializer.Meta.fields, "lineups"]


class MapSerializer(serializers.ModelSerializer):
    # El id que consume el frontend es el slug ("mirage", "inferno", ...).
    id = serializers.CharField(source="slug", read_only=True)
    unlocked = serializers.SerializerMethodField()
    unlock_cost = serializers.SerializerMethodField()
    unlock_stats = serializers.SerializerMethodField()
    places = PlaceDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Map
        fields = ["id", "name", "image_url", "is_free", "requires_pro_plan", "unlocked", "unlock_cost", "unlock_stats", "places"]
        read_only_fields = fields

    def get_unlocked(self, obj: Map) -> bool:
        context = self.context.get("context", {})
        unlocked_map_slugs = context.get("unlocked_map_slugs", set())
        return obj.is_free or obj.slug in unlocked_map_slugs

    def get_unlock_cost(self, obj: Map) -> int:
        from apps.progression import constants

        return 0 if obj.is_free else constants.COIN_COST_MAP

    def get_unlock_stats(self, obj: Map) -> dict:
        """Conteos de desbloqueo: lugares y lineups (total y del usuario)."""
        context = self.context.get("context", {})
        unlocked_place_ids = context.get("unlocked_place_ids", set())
        unlocked_lineup_ids = context.get("unlocked_lineup_ids", set())
        total_places = 0
        unlocked_places = 0
        total_lineups = 0
        unlocked_lineups = 0
        for place in obj.places.all():
            total_places += 1
            if place.id in unlocked_place_ids:
                unlocked_places += 1
            for lineup in place.lineups.all():
                total_lineups += 1
                if lineup.id in unlocked_lineup_ids:
                    unlocked_lineups += 1
        return {
            "total_places": total_places,
            "unlocked_places": unlocked_places,
            "total_lineups": total_lineups,
            "unlocked_lineups": unlocked_lineups,
        }