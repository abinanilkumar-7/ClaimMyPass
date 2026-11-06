
from django.db import models
import uuid
from django.conf import settings


class Movie(models.Model):
    GENRE_CHOICES = [
        ("ACTION", "Action"),
        ("COMEDY", "Comedy"),
        ("DRAMA", "Drama"),
        ("THRILLER", "Thriller"),
        ("ROMANCE", "Romance"),
        ("HORROR", "Horror"),
        ("SCIFI", "Sci-Fi"),
        ("ANIMATION", "Animation"),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    poster_url = models.URLField(max_length=500, blank=True)
    backdrop_url = models.URLField(max_length=500, blank=True)
    trailer_url = models.URLField(max_length=500, blank=True)
    language = models.CharField(max_length=50)
    genre = models.CharField(max_length=20, choices=GENRE_CHOICES)
    duration_minutes = models.PositiveIntegerField()
    release_date = models.DateField(null=True, blank=True)
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        default=0.0,
    )
    is_featured = models.BooleanField(
    default=False,
    help_text="Display this movie in the homepage hero section.",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class City(models.Model):
    name = models.CharField(max_length=100, unique=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default="India")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Cities"

    def __str__(self):
        return f"{self.name}, {self.state}" if self.state else self.name


class Theatre(models.Model):
    name = models.CharField(max_length=200)
    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name="theatres",)
    address = models.TextField()
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["city", "name"]

    def __str__(self):
        return f"{self.name} - {self.city}"


class Screen(models.Model):
    FORMAT_CHOICES = [
        ("2D", "2D"),
        ("3D", "3D"),
        ("IMAX", "IMAX"),
        ("4DX", "4DX"),
        ("IMAX_3D", "IMAX 3D"),
    ]

    theatre = models.ForeignKey(
        Theatre,
        on_delete=models.CASCADE,
        related_name="screens",
    )
    name = models.CharField(max_length=100)
    capacity = models.PositiveIntegerField()
    supported_formats = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["theatre", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["theatre", "name"],
                name="unique_screen_name_per_theatre",
            )
        ]

    def __str__(self):
        return f"{self.theatre.name} - {self.name}"


class ScreenSeat(models.Model):
    TIER_CHOICES = [
        ("standard", "Standard"),
        ("premium", "Premium"),
        ("vip", "VIP"),
    ]

    screen = models.ForeignKey(
        Screen,
        on_delete=models.CASCADE,
        related_name="layout_seats",
    )
    row = models.CharField(max_length=3)
    number = models.PositiveIntegerField()
    tier = models.CharField(
        max_length=10,
        choices=TIER_CHOICES,
        default="standard",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["row", "number"]
        constraints = [
            models.UniqueConstraint(
                fields=["screen", "row", "number"],
                name="unique_screen_seat_position",
            )
        ]

    def __str__(self):
        return f"{self.screen} - {self.row}{self.number}"


class Show(models.Model):
    FORMAT_CHOICES = [
        ("2D", "2D"),
        ("3D", "3D"),
        ("IMAX", "IMAX"),
        ("4DX", "4DX"),
        ("IMAX_3D", "IMAX 3D"),
    ]

    movie = models.ForeignKey(
        Movie,
        on_delete=models.PROTECT,
        related_name="shows",
    )
    screen = models.ForeignKey(
        Screen,
        on_delete=models.PROTECT,
        related_name="shows",
    )
    start_time = models.DateTimeField()
    format = models.CharField(
        max_length=20,
        choices=FORMAT_CHOICES,
        default="2D",
    )
    standard_price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
    )
    premium_price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
    )
    vip_price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start_time"]
        indexes = [
            models.Index(fields=["screen", "start_time"]),
            models.Index(fields=["movie", "start_time"]),
        ]

    def __str__(self):
        return f"{self.movie.title} - {self.screen} - {self.start_time}"

import uuid


class Seat(models.Model):
    TIER_CHOICES = [
        ("standard", "Standard"),
        ("premium", "Premium"),
        ("vip", "VIP"),
    ]

    show = models.ForeignKey(
        Show,
        on_delete=models.CASCADE,
        related_name="seats",
    )
    row = models.CharField(max_length=3)
    number = models.PositiveIntegerField()
    tier = models.CharField(
        max_length=10,
        choices=TIER_CHOICES,
        default="standard",
    )
    price = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        ordering = ["row", "number"]
        constraints = [
            models.UniqueConstraint(
                fields=["show", "row", "number"],
                name="unique_seat_per_show",
            )
        ]

    def __str__(self):
        return f"{self.show} - {self.row}{self.number}"


class Booking(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("CONFIRMED", "Confirmed"),
        ("CANCELLED", "Cancelled"),
        ("EXPIRED", "Expired"),
    ]

    booking_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="movie_bookings",
        null=True,
        blank=True,
    )
    show = models.ForeignKey(
        Show,
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    customer_name = models.CharField(max_length=150)
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=20)
    seat_ids = models.JSONField(default=list)
    concessions = models.JSONField(default=list, blank=True)

    subtotal_tickets = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    subtotal_concessions = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    convenience_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    taxes = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    confirmed_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    checked_in_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date and time when the ticket was scanned at entry.",
    )

    checked_in_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="claimmypass_check_ins",
        help_text="Staff member who verified the ticket.",
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=12,
        choices=STATUS_CHOICES,
        default="PENDING",
    )
    hold_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.booking_id} - {self.status}"



class SeatHold(models.Model):
    seat = models.ForeignKey(
        Seat,
        on_delete=models.CASCADE,
        related_name="holds",
    )
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name="holds",
        null=True,
        blank=True,
    )
    hold_token = models.UUIDField(default=uuid.uuid4, editable=False)
    expires_at = models.DateTimeField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["seat"],
                name="unique_active_seat_hold_record",
            )
        ]

    def __str__(self):
        return f"{self.seat} held until {self.expires_at}"
