from rest_framework import serializers

from .models import Progression


class ProgressionSerializer(serializers.ModelSerializer):
    """Contadores. El nivel y el progreso dentro del nivel los calcula el frontend."""

    class Meta:
        model = Progression
        fields = ["xp", "coins", "streak", "best_streak"]
        read_only_fields = fields