from django.urls import path

from .views import LineupDetailView, MapListView, PlaceListByMapView

urlpatterns = [
    path("", MapListView.as_view(), name="map_list"),
    path("<slug:map_slug>/places/", PlaceListByMapView.as_view(), name="place_list"),
    path("lineups/<int:pk>/", LineupDetailView.as_view(), name="lineup_detail"),
]