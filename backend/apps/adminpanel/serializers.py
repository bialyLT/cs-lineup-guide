"""Serializers del panel de administración.

Son serializers de solo-escritura administrativa: exponen campos completos
(incluidos internos como is_staff) y NO exponen el hash del password. El
password solo se acepta de forma write_only para crearlo/cambiarlo.
"""

from rest_framework import serializers

from apps.accounts.models import User
from apps.maps.models import Lineup, LineupImage, Map, Place
from apps.progression.models import (
    Progression,
    QuestionTypeConfig,
    UserLineupUnlock,
    UserMapUnlock,
    UserPlaceUnlock,
    UserQuestionTypeUnlock,
    VideoRewardClaim,
    VideoRewardConfig,
)
from apps.quiz.models import Option, Question, Quiz, QuizQuestion

from .models import AdminAuditLog


class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, min_length=8
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "display_name",
            "first_name",
            "last_name",
            "is_staff",
            "is_superuser",
            "is_active",
            "plan",
            "date_joined",
            "last_login",
            "password",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class AdminMapSerializer(serializers.ModelSerializer):
    class Meta:
        model = Map
        fields = ["id", "name", "slug", "image_url", "is_free", "order"]
        read_only_fields = ["id"]


class AdminPlaceSerializer(serializers.ModelSerializer):
    map_name = serializers.CharField(source="map.name", read_only=True)

    class Meta:
        model = Place
        fields = ["id", "map", "map_name", "name", "order", "position_x", "position_y"]
        read_only_fields = ["id"]


class AdminLineupSerializer(serializers.ModelSerializer):
    map_name = serializers.CharField(source="place.map.name", read_only=True)
    place_name = serializers.CharField(source="place.name", read_only=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Lineup
        fields = [
            "id",
            "place",
            "place_name",
            "map_name",
            "title",
            "util",
            "description",
            "order",
            "question_count",
        ]
        read_only_fields = ["id"]

    def get_question_count(self, obj: Lineup) -> int:
        # Con prefetch_related("questions") usa la cache, sin consulta extra.
        return len(obj.questions.all())


class AdminLineupImageSerializer(serializers.ModelSerializer):
    map_name = serializers.CharField(source="lineup.place.map.name", read_only=True)
    lineup_title = serializers.CharField(source="lineup.title", read_only=True)

    class Meta:
        model = LineupImage
        fields = [
            "id",
            "lineup",
            "lineup_title",
            "map_name",
            "image_url",
            "order",
        ]
        read_only_fields = ["id"]


class AdminQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = [
            "id",
            "map",
            "lineup",
            "place",
            "type",
            "prompt",
            "helper_text",
            "image_url",
        ]
        read_only_fields = ["id"]


class AdminOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = [
            "id",
            "question",
            "text",
            "position_x",
            "position_y",
            "is_correct",
            "order",
        ]
        read_only_fields = ["id"]


class AdminQuizSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ["id", "user", "title", "maps", "created_at"]
        read_only_fields = ["id", "created_at"]


class AdminQuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = ["id", "quiz", "question", "order"]
        read_only_fields = ["id"]


class AdminProgressionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Progression
        fields = [
            "id",
            "user",
            "xp",
            "coins",
            "streak",
            "best_streak",
            "last_streak_at",
        ]
        read_only_fields = ["id", "last_streak_at"]


class AdminUserMapUnlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserMapUnlock
        fields = ["id", "user", "map", "unlocked_at"]
        read_only_fields = ["id", "unlocked_at"]


class AdminUserPlaceUnlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPlaceUnlock
        fields = ["id", "user", "place", "via", "unlocked_at"]
        read_only_fields = ["id", "unlocked_at"]


class AdminUserLineupUnlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLineupUnlock
        fields = ["id", "user", "lineup", "unlocked_at"]
        read_only_fields = ["id", "unlocked_at"]


class AdminUserQuestionTypeUnlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserQuestionTypeUnlock
        fields = ["id", "user", "question_type", "unlocked_at"]
        read_only_fields = ["id", "unlocked_at"]


class AdminQuestionTypeConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionTypeConfig
        fields = ["id", "question_type", "label", "unlock_level", "order", "utility_levels"]
        read_only_fields = ["id"]


class AdminVideoRewardConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoRewardConfig
        fields = ["id", "coins", "cooldown_hours", "enabled", "video_url"]
        read_only_fields = ["id"]


class AdminVideoRewardClaimSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = VideoRewardClaim
        fields = ["id", "user", "username", "claimed_at"]
        read_only_fields = fields


class AdminAuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.username", read_only=True)
    action_display = serializers.CharField(
        source="get_action_display", read_only=True
    )

    class Meta:
        model = AdminAuditLog
        fields = [
            "id",
            "actor",
            "actor_name",
            "action",
            "action_display",
            "app_label",
            "model_name",
            "object_id",
            "summary",
            "ip_address",
            "created_at",
        ]
        read_only_fields = fields
