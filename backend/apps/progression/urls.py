from django.urls import path

from .views import FreePlaceView, MeView, RankingView, UnlockView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("me/free-place/", FreePlaceView.as_view(), name="me_free_place"),
    path("me/unlock/", UnlockView.as_view(), name="me_unlock"),
    path("ranking/", RankingView.as_view(), name="ranking"),
]