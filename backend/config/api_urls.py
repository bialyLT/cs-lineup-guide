"""URLs de la API REST (agrupadas por dominio)."""
from django.http import JsonResponse
from django.urls import include, path

from apps.quiz.views import (
    AnswerQuestionView,
    QuizConfigView,
    ReportQuestionView,
)
from apps.maps.views import LineupDetailView


def health(request):  # noqa: ANN001, ANN201
    """Endpoint sin autenticación para health checks de la plataforma."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("health/", health, name="health"),
    path("auth/", include("apps.accounts.urls")),
    path("maps/", include("apps.maps.urls")),
    path("lineups/<int:pk>/", LineupDetailView.as_view(), name="lineup_detail"),
    path("quizzes/", include("apps.quiz.urls")),
    path("quizzes/<int:quiz_id>/questions/<int:pk>/answer/", AnswerQuestionView.as_view(), name="question_answer"),
    path("questions/<int:pk>/report/", ReportQuestionView.as_view(), name="question_report"),
    path("quiz-config/", QuizConfigView.as_view(), name="quiz_config_root"),
    path("admin/", include("apps.adminpanel.urls")),
    path("", include("apps.progression.urls")),
]