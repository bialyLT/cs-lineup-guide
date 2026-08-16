from django.urls import path

from .views import (
    FreePlaceView,
    MeView,
    RankingView,
    StarterPlacesView,
    UnlockView,
)

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("me/free-place/", FreePlaceView.as_view(), name="me_free_place"),
    path("me/starter-places/", StarterPlacesView.as_view(), name="me_starter_places"),
    path("me/unlock/", UnlockView.as_view(), name="me_unlock"),
    path("ranking/", RankingView.as_view(), name="ranking"),
]