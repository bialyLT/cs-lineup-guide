"""Views del panel de administración.

Cada recurso es un ModelViewSet completo (list/retrieve/create/update/delete)
protegido con IsStaffUser, con throttling y registro de auditoría en las
mutaciones. AdminAuditLog es solo lectura para preservar la integridad del
trail.
"""

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets

from apps.accounts.models import User
from apps.maps.models import Lineup, LineupImage, Map, Place
from apps.progression.models import (
    Progression,
    QuestionTypeConfig,
    UserLineupUnlock,
    UserMapUnlock,
    UserPlaceUnlock,
    UserQuestionTypeUnlock,
)
from apps.quiz.models import Option, Question, Quiz, QuizQuestion
from apps.quiz.services import sync_map_location_questions

from .mixins import AuditLogMixin
from .models import AdminAuditLog
from .permissions import IsStaffUser
from .serializers import (
    AdminAuditLogSerializer,
    AdminLineupImageSerializer,
    AdminLineupSerializer,
    AdminMapSerializer,
    AdminOptionSerializer,
    AdminPlaceSerializer,
    AdminProgressionSerializer,
    AdminQuestionSerializer,
    AdminQuestionTypeConfigSerializer,
    AdminQuizQuestionSerializer,
    AdminQuizSerializer,
    AdminUserLineupUnlockSerializer,
    AdminUserMapUnlockSerializer,
    AdminUserPlaceUnlockSerializer,
    AdminUserQuestionTypeUnlockSerializer,
    AdminUserSerializer,
)
from .throttles import AdminBurstThrottle


class AdminViewSetMixin:
    permission_classes = [IsStaffUser]
    throttle_classes = [AdminBurstThrottle]
    pagination_class = None
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]


class AuditLogViewSetMixin(AdminViewSetMixin, AuditLogMixin):
    pass


class UserViewSet(AuditLogViewSetMixin, viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = AdminUserSerializer


class MapViewSet(AuditLogViewSetMixin, viewsets.ModelViewSet):
    queryset = Map.objects.all()
    serializer_class = AdminMapSerializer


class PlaceViewSet(AuditLogViewSetMixin, viewsets.ModelViewSet):
    """Soporta el filtro `?map=<id>` para ver los lugares de un mapa."""
    serializer_class = AdminPlaceSerializer

    def get_queryset(self):
        queryset = Place.objects.select_related("map").all()
        map_id = self.request.query_params.get("map")
        if map_id:
            queryset = queryset.filter(map_id=map_id)
        return queryset

    def perform_create(self, serializer):
        instance = serializer.save()
        sync_map_location_questions(instance.map)

    def perform_update(self, serializer):
        instance = serializer.save()
        sync_map_location_questions(instance.map)

    def perform_destroy(self, instance):
        map_ = instance.map
        instance.delete()
        sync_map_location_questions(map_)


class LineupViewSet(AuditLogViewSetMixin, viewsets.ModelViewSet):
    """Soporta `?map=<id>`, `?place=<id>` y `?util=<value>`."""
    serializer_class = AdminLineupSerializer

    def get_queryset(self):
        queryset = Lineup.objects.select_related("place__map").prefetch_related("questions")
        map_id = self.request.query_params.get("map")
        if map_id:
            queryset = queryset.filter(place__map_id=map_id)
        place_id = self.request.query_params.get("place")
        if place_id:
            queryset = queryset.filter(place_id=place_id)
        util = self.request.query_params.get("util")
        if util:
            queryset = queryset.filter(util=util)
        return queryset


class LineupImageViewSet(AuditLogViewSetMixin, viewsets.ModelViewSet):
    """Imágenes de un lineup (galería). Soporta `?lineup=<id>`."""

    serializer_class = AdminLineupImageSerializer

    def get_queryset(self):
        queryset = LineupImage.objects.select_related("lineup__place__map").all()
        lineup_id = self.request.query_params.get("lineup")
        if lineup_id:
            queryset = queryset.filter(lineup_id=lineup_id)
        return queryset


class QuestionViewSet(AuditLogViewSetMixin, viewsets.ModelViewSet):
    """Soporta `?map=<id>`, `?lineup=<id>`, `?place=<id>` y `?type=<value>`."""
    serializer_class = AdminQuestionSerializer

    def get_queryset(self):
        queryset = Question.objects.select_related("map", "lineup", "place").all()
        map_id = self.request.query_params.get("map")
        if map_id:
            queryset = queryset.filter(map_id=map_id)
        lineup_id = self.request.query_params.get("lineup")
        if lineup_id:
            queryset = queryset.filter(lineup_id=lineup_id)
        place_id = self.request.query_params.get("place")
        if place_id:
            queryset = queryset.filter(place_id=place_id)
        qtype = self.request.query_params.get("type")
        if qtype:
            queryset = queryset.filter(type=qtype)
        return queryset


class OptionViewSet(AuditLogViewSetMixin, viewsets.ModelViewSet):
    """Soporta `?question=<id>` para listar las opciones de una pregunta."""
    serializer_class = AdminOptionSerializer

    def get_queryset(self):
        queryset = Option.objects.select_related("question").all()
        question_id = self.request.query_params.get("question")
        if question_id:
            queryset = queryset.filter(question_id=question_id)
        return queryset


class QuizViewSet(AuditLogViewSetMixin, viewsets.ModelViewSet):
    queryset = Quiz.objects.select_related("user").all()
    serializer_class = AdminQuizSerializer


class QuizQuestionViewSet(AuditLogViewSetMixin, viewsets.ModelViewSet):
    queryset = QuizQuestion.objects.select_related("quiz", "question").all()
    serializer_class = AdminQuizQuestionSerializer


class ProgressionViewSet(AuditLogViewSetMixin, viewsets.ModelViewSet):
    queryset = Progression.objects.select_related("user").all()
    serializer_class = AdminProgressionSerializer


class UserMapUnlockViewSet(AuditLogViewSetMixin, viewsets.ModelViewSet):
    queryset = UserMapUnlock.objects.select_related("user", "map").all()
    serializer_class = AdminUserMapUnlockSerializer


class UserPlaceUnlockViewSet(AuditLogViewSetMixin, viewsets.ModelViewSet):
    queryset = UserPlaceUnlock.objects.select_related("user", "place").all()
    serializer_class = AdminUserPlaceUnlockSerializer


class UserLineupUnlockViewSet(AuditLogViewSetMixin, viewsets.ModelViewSet):
    queryset = UserLineupUnlock.objects.select_related("user", "lineup__place__map").all()
    serializer_class = AdminUserLineupUnlockSerializer


class UserQuestionTypeUnlockViewSet(AuditLogViewSetMixin, viewsets.ModelViewSet):
    queryset = UserQuestionTypeUnlock.objects.select_related("user").all()
    serializer_class = AdminUserQuestionTypeUnlockSerializer


class QuestionTypeConfigViewSet(AuditLogViewSetMixin, viewsets.ModelViewSet):
    """Configuración global del desbloqueo de tipos de pregunta
    (nivel 0 = inicial, 1+ = nivel, vacío = monedas; niveles por utilidad)."""

    queryset = QuestionTypeConfig.objects.all()
    serializer_class = AdminQuestionTypeConfigSerializer


class AdminAuditLogViewSet(AdminViewSetMixin, viewsets.ReadOnlyModelViewSet):
    """Solo lectura: el trail de auditoría no se puede editar ni borrar."""

    queryset = AdminAuditLog.objects.select_related("actor").all()
    serializer_class = AdminAuditLogSerializer


class AdminStatsView(APIView):
    """GET /api/admin/stats/ → conteos por modelo + actividad reciente."""

    permission_classes = [IsStaffUser]
    throttle_classes = [AdminBurstThrottle]

    def get(self, request):
        recent = AdminAuditLog.objects.select_related("actor").all()[:10]
        return Response(
            {
                "counts": {
                    "users": User.objects.count(),
                    "maps": Map.objects.count(),
                    "places": Place.objects.count(),
                    "lineups": Lineup.objects.count(),
                    "questions": Question.objects.count(),
                    "options": Option.objects.count(),
                    "quizzes": Quiz.objects.count(),
                    "quiz_questions": QuizQuestion.objects.count(),
                    "progressions": Progression.objects.count(),
                    "map_unlocks": UserMapUnlock.objects.count(),
                    "place_unlocks": UserPlaceUnlock.objects.count(),
                    "question_type_unlocks": UserQuestionTypeUnlock.objects.count(),
                    "audit_logs": AdminAuditLog.objects.count(),
                },
                "recent_activity": AdminAuditLogSerializer(recent, many=True).data,
            }
        )
