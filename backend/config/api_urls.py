"""URLs de la API REST (agrupadas por dominio)."""
from django.urls import include, path

from apps.quiz.views import AnswerQuestionView

urlpatterns = [
    path("auth/", include("apps.accounts.urls")),
    path("maps/", include("apps.maps.urls")),
    path("quizzes/", include("apps.quiz.urls")),
    path("questions/<int:pk>/answer/", AnswerQuestionView.as_view(), name="question_answer"),
    path("", include("apps.progression.urls")),
]