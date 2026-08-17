"""URLs de la API REST (agrupadas por dominio)."""
from django.http import JsonResponse
from django.urls import include, path

from apps.quiz.views import AnswerQuestionView


def health(request):  # noqa: ANN001, ANN201
    """Endpoint sin autenticación para health checks de la plataforma."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("health/", health, name="health"),
    path("auth/", include("apps.accounts.urls")),
    path("maps/", include("apps.maps.urls")),
    path("quizzes/", include("apps.quiz.urls")),
    path("questions/<int:pk>/answer/", AnswerQuestionView.as_view(), name="question_answer"),
    path("admin/", include("apps.adminpanel.urls")),
    path("", include("apps.progression.urls")),
]