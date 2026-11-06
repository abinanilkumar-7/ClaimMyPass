
from django.urls import path

from .views import (
    MovieListAPIView,
    CityListAPIView,
    TheatreListAPIView,
    ScreenListAPIView,
    ShowListAPIView,
    ShowCreateAPIView,
    ShowSeatListAPIView,
    SeatHoldAPIView,
)


urlpatterns = [
    path("", MovieListAPIView.as_view(), name="movie-list"),
    path("theatres/", TheatreListAPIView.as_view(), name="theatre-list"),
    path("screens/", ScreenListAPIView.as_view(), name="screen-list"),
    path("shows/", ShowListAPIView.as_view(), name="show-list"),
    path("shows/create/",ShowCreateAPIView.as_view(),name="show-create",),
    path("shows/<int:show_id>/seats/",ShowSeatListAPIView.as_view(),name="show-seat-list",),
    path("shows/<int:show_id>/hold/",SeatHoldAPIView.as_view(),name="seat-hold",),
    path("cities/", CityListAPIView.as_view(), name="city-list"),
]
