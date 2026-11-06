
from django.utils import timezone
from rest_framework import serializers

from .models import (
    Booking,
    City,
    Movie,
    Screen,
    ScreenSeat,
    Seat,
    SeatHold,
    Show,
    Theatre,
)
from .services import create_show_with_seats


class MovieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movie
        fields = "__all__"


class TheatreSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(
        source="city.name",
        read_only=True,
    )
    state = serializers.CharField(
        source="city.state",
        read_only=True,
    )
    country = serializers.CharField(
        source="city.country",
        read_only=True,
    )

    class Meta:
        model = Theatre
        fields = [
            "id",
            "name",
            "city",
            "city_name",
            "state",
            "country",
            "address",
            "description",
            "is_active",
        ]

class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = ["id", "name", "state", "country", "is_active"]


class ScreenSerializer(serializers.ModelSerializer):
    theatre_name = serializers.CharField(
        source="theatre.name",
        read_only=True,
    )

    class Meta:
        model = Screen
        fields = "__all__"


class ShowSerializer(serializers.ModelSerializer):
    movie_title = serializers.CharField(
        source="movie.title",
        read_only=True,
    )
    theatre_name = serializers.CharField(
        source="screen.theatre.name",
        read_only=True,
    )
    screen_name = serializers.CharField(
        source="screen.name",
        read_only=True,
    )
    theatre_id = serializers.IntegerField(
        source="screen.theatre.id",
        read_only=True,
    )

    class Meta:
        model = Show
        fields = [
        "id",
        "movie",
        "movie_title",
        "screen",
        "screen_name",
        "theatre_id",
        "theatre_name",
        "start_time",
        "format",
        "standard_price",
        "premium_price",
        "vip_price",
        "is_active",
    ]


class SeatSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = Seat
        fields = [
            "id",
            "show",
            "row",
            "number",
            "tier",
            "price",
            "status",
        ]

    def get_status(self, seat):
        now = timezone.now()

        is_booked = Booking.objects.filter(
            show=seat.show,
            status="CONFIRMED",
            seat_ids__contains=[seat.id],
        ).exists()

        if is_booked:
            return "booked"

        is_held = SeatHold.objects.filter(
            seat=seat,
            expires_at__gt=now,
        ).exists()

        if is_held:
            return "held"

        return "available"


class ShowCreateSerializer(serializers.ModelSerializer):
    movie_title = serializers.CharField(
        source="movie.title",
        read_only=True,
    )
    theatre_name = serializers.CharField(
        source="screen.theatre.name",
        read_only=True,
    )
    screen_name = serializers.CharField(
        source="screen.name",
        read_only=True,
    )
    seat_count = serializers.SerializerMethodField()

    class Meta:
        model = Show
        fields = [
            "id",
            "movie",
            "movie_title",
            "screen",
            "screen_name",
            "theatre_name",
            "start_time",
            "format",
            "standard_price",
            "premium_price",
            "vip_price",
            "seat_count",
        ]
        read_only_fields = [
            "id",
            "movie_title",
            "screen_name",
            "theatre_name",
            "seat_count",
        ]

    def validate(self, attrs):
        movie = attrs["movie"]
        screen = attrs["screen"]
        start_time = attrs["start_time"]
        show_format = attrs["format"]

        if not movie.is_active:
            raise serializers.ValidationError({
                "movie": "This movie is inactive."
            })

        if not screen.is_active or not screen.theatre.is_active:
            raise serializers.ValidationError({
                "screen": "This screen or theatre is inactive."
            })

        if start_time <= timezone.now():
            raise serializers.ValidationError({
                "start_time": "The showtime must be in the future."
            })

        if (
            screen.supported_formats
            and show_format not in screen.supported_formats
        ):
            raise serializers.ValidationError({
                "format": "This screen does not support the selected format."
            })

        has_layout = ScreenSeat.objects.filter(
            screen=screen,
            is_active=True,
        ).exists()

        if not has_layout:
            raise serializers.ValidationError({
                "screen": "This screen has no active seat layout."
            })

        for field in (
            "standard_price",
            "premium_price",
            "vip_price",
        ):
            if attrs[field] <= 0:
                raise serializers.ValidationError({
                    field: "Price must be greater than zero."
                })

        return attrs

    def create(self, validated_data):
        try:
            return create_show_with_seats(
                movie=validated_data["movie"],
                screen=validated_data["screen"],
                start_time=validated_data["start_time"],
                show_format=validated_data["format"],
                standard_price=validated_data["standard_price"],
                premium_price=validated_data["premium_price"],
                vip_price=validated_data["vip_price"],
            )
        except ValueError as exc:
            raise serializers.ValidationError({
                "detail": str(exc)
            }) from exc

    def get_seat_count(self, show):
        return show.seats.count()