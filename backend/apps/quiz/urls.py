from django.urls import path

from .views import GenerateQuizView, QuizAvailabilityView, QuizConfigView

urlpatterns = [
    path("config/", QuizConfigView.as_view(), name="quiz_config"),
    path("available/", QuizAvailabilityView.as_view(), name="quiz_available"),
    path("generate/", GenerateQuizView.as_view(), name="quiz_generate"),
]