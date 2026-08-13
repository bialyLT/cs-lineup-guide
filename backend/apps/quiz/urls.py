from django.urls import path

from .views import GenerateQuizView

urlpatterns = [
    path("generate/", GenerateQuizView.as_view(), name="quiz_generate"),
]