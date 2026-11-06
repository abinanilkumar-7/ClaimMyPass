
import uuid
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Booking,
    City,
    Movie,
    Screen,
    Seat,
    SeatHold,
    Show,
    Theatre,
)
from .serializers import (
    MovieSerializer,
    CitySerializer,
    ScreenSerializer,
    SeatSerializer,
    ShowCreateSerializer,
    ShowSerializer,
    TheatreSerializer,
)



class MovieListAPIView(generics.ListAPIView):
    """List active movies."""

    serializer_class = MovieSerializer

    def get_queryset(self):
        return Movie.objects.filter(is_active=True)


class CityListAPIView(generics.ListAPIView):
    serializer_class = CitySerializer

    def get_queryset(self):
        return City.objects.filter(is_active=True).order_by("name")


class TheatreListAPIView(generics.ListAPIView):
    """List active theatres."""

    serializer_class = TheatreSerializer

    def get_queryset(self):
        return Theatre.objects.filter(is_active=True)


class ScreenListAPIView(generics.ListAPIView):
    """List screens belonging to active theatres."""

    serializer_class = ScreenSerializer

    def get_queryset(self):
        return Screen.objects.filter(
            is_active=True,
            theatre__is_active=True,
        ).select_related("theatre")


class ShowListAPIView(generics.ListAPIView):
    """List shows available at active cinemas."""

    serializer_class = ShowSerializer

    def get_queryset(self):
        return Show.objects.filter(
            is_active=True,
            movie__is_active=True,
            screen__is_active=True,
            screen__theatre__is_active=True,
        ).select_related(
            "movie",
            "screen",
            "screen__theatre",
        )


class ShowSeatListAPIView(generics.ListAPIView):
    """List seats for an active show."""

    serializer_class = SeatSerializer

    def get_queryset(self):
        return Seat.objects.filter(
            show_id=self.kwargs["show_id"],
            show__is_active=True,
            show__movie__is_active=True,
            show__screen__is_active=True,
            show__screen__theatre__is_active=True,
        ).select_related("show").order_by("row", "number")


class SeatHoldAPIView(APIView):
    """Create, extend, or release temporary seat holds."""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    hold_duration = timedelta(minutes=10)
    max_seats_per_request = 8

    def post(self, request, show_id):
        seat_ids = request.data.get("seat_ids")
        token_value = request.data.get("hold_token")

        if (
            not isinstance(seat_ids, list)
            or not 1 <= len(seat_ids) <= self.max_seats_per_request
            or any(type(seat_id) is not int for seat_id in seat_ids)
            or len(set(seat_ids)) != len(seat_ids)
        ):
            return Response(
                {"error": "Provide 1–8 unique integer seat IDs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            hold_token = (
                uuid.UUID(str(token_value))
                if token_value
                else uuid.uuid4()
            )
        except (ValueError, TypeError, AttributeError):
            return Response(
                {"error": "Invalid hold token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        expires_at = now + self.hold_duration

        with transaction.atomic():
            show_is_available = Show.objects.filter(
                id=show_id,
                is_active=True,
                movie__is_active=True,
                screen__is_active=True,
                screen__theatre__is_active=True,
                start_time__gt=now,
            ).exists()

            if not show_is_available:
                return Response(
                    {"error": "This show is unavailable."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            seats = list(
                Seat.objects.select_for_update()
                .filter(show_id=show_id, id__in=seat_ids)
                .order_by("id")
            )

            if len(seats) != len(seat_ids):
                return Response(
                    {"error": "One or more seats do not belong to this show."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Remove expired holds for the requested seats.
            SeatHold.objects.filter(
                seat_id__in=seat_ids,
                expires_at__lte=now,
            ).delete()

            # Reject seats already included in confirmed bookings.
            booked_ids = set()

            for booking in Booking.objects.filter(
                show_id=show_id,
                status="CONFIRMED",
            ).only("seat_ids"):
                booked_ids.update(booking.seat_ids or [])

            if booked_ids.intersection(seat_ids):
                return Response(
                    {"error": "One or more seats are already booked."},
                    status=status.HTTP_409_CONFLICT,
                )

            existing_holds = list(
                SeatHold.objects.filter(seat_id__in=seat_ids)
            )

            if any(
                hold.hold_token != hold_token
                for hold in existing_holds
            ):
                return Response(
                    {
                        "error": (
                            "One or more seats are held by another session."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            # Extend this token's existing active holds.
            SeatHold.objects.filter(
                hold_token=hold_token,
                expires_at__gt=now,
            ).update(expires_at=expires_at)

            existing_seat_ids = {
                hold.seat_id for hold in existing_holds
            }

            # Create holds only for seats not already held by this token.
            SeatHold.objects.bulk_create(
                [
                    SeatHold(
                        seat=seat,
                        hold_token=hold_token,
                        expires_at=expires_at,
                    )
                    for seat in seats
                    if seat.id not in existing_seat_ids
                ]
            )

        return Response(
            {
                "hold_token": str(hold_token),
                "seat_ids": seat_ids,
                "expires_at": expires_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, show_id):
        token_value = request.data.get("hold_token")
        seat_ids = request.data.get("seat_ids")

        try:
            hold_token = uuid.UUID(str(token_value))
        except (ValueError, TypeError, AttributeError):
            return Response(
                {"error": "A valid hold token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        holds = SeatHold.objects.filter(
            hold_token=hold_token,
            seat__show_id=show_id,
        )

        if seat_ids is not None:
            if (
                not isinstance(seat_ids, list)
                or not seat_ids
                or any(type(seat_id) is not int for seat_id in seat_ids)
                or len(set(seat_ids)) != len(seat_ids)
            ):
                return Response(
                    {
                        "error": (
                            "seat_ids must be a non-empty list "
                            "of unique integer IDs."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            matching_count = Seat.objects.filter(
                show_id=show_id,
                id__in=seat_ids,
            ).count()

            if matching_count != len(seat_ids):
                return Response(
                    {"error": "One or more seats do not belong to this show."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            holds = holds.filter(seat_id__in=seat_ids)

        deleted_count, _ = holds.delete()

        return Response({"released": deleted_count})


class ShowCreateAPIView(generics.CreateAPIView):
    """Create a show and generate its seats."""

    serializer_class = ShowCreateSerializer
    permission_classes = [IsAdminUser]
