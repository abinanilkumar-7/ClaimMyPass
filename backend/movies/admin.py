
from string import ascii_uppercase

from django.utils import timezone
from django.core.exceptions import ValidationError
from .services import generate_seats_for_show
from django import forms
from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils.html import format_html

from .models import (
    City,
    Movie,
    Theatre,
    Screen,
    ScreenSeat,
    Show,
    Seat,
    Booking,
    SeatHold,
)


class ScreenLayoutForm(forms.Form):
    rows = forms.IntegerField(
        min_value=1,
        max_value=26,
        initial=8,
        label="Number of rows",
    )
    seats_per_row = forms.IntegerField(
        min_value=1,
        max_value=40,
        initial=10,
        label="Seats per row",
    )
    vip_rows = forms.IntegerField(
        min_value=0,
        initial=2,
        label="VIP rows from the front",
    )
    premium_rows = forms.IntegerField(
        min_value=0,
        initial=3,
        label="Premium rows after VIP",
    )

    def clean(self):
        cleaned_data = super().clean()

        rows = cleaned_data.get("rows")
        vip_rows = cleaned_data.get("vip_rows")
        premium_rows = cleaned_data.get("premium_rows")

        if (
            rows is not None
            and vip_rows is not None
            and premium_rows is not None
            and vip_rows + premium_rows > rows
        ):
            raise forms.ValidationError(
                "VIP rows plus Premium rows cannot exceed total rows."
            )

        return cleaned_data

class ShowAdminForm(forms.ModelForm):

    class Meta:
        model = Show
        fields = "__all__"

    def clean(self):
        cleaned_data = super().clean()

        movie = cleaned_data.get("movie")
        screen = cleaned_data.get("screen")
        start_time = cleaned_data.get("start_time")
        show_format = cleaned_data.get("format")

        if movie and not movie.is_active:
            self.add_error("movie", "This movie is inactive.")

        if screen:
            if not screen.is_active:
                self.add_error("screen", "This screen is inactive.")

            if not screen.theatre.is_active:
                self.add_error(
                    "screen",
                    "This theatre is inactive."
                )

            if (
                screen.supported_formats
                and show_format not in screen.supported_formats
            ):
                self.add_error(
                    "format",
                    "This screen does not support the selected format."
                )

            has_layout = ScreenSeat.objects.filter(
                screen=screen,
                is_active=True,
            ).exists()

            if not has_layout:
                self.add_error(
                    "screen",
                    "Configure the screen seating layout before creating a show."
                )

        if (
            start_time
            and not self.instance.pk
            and start_time <= timezone.now()
        ):
            self.add_error(
                "start_time",
                "The showtime must be in the future."
            )

        for field in (
            "standard_price",
            "premium_price",
            "vip_price",
        ):
            price = cleaned_data.get(field)

            if price is not None and price <= 0:
                self.add_error(
                    field,
                    "Price must be greater than zero."
                )

        return cleaned_data

@admin.register(Screen)
class ScreenAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "theatre",
        "capacity",
        "is_active",
        "generate_layout_link",
    )
    list_filter = ("theatre", "is_active")
    search_fields = ("name", "theatre__name")

    @admin.display(description="Seat layout")
    def generate_layout_link(self, obj):
        url = reverse(
            "admin:movies_screen_generate_seat_layout",
            args=[obj.pk],
        )
        return format_html(
            '<a class="button" href="{}">Generate seat layout</a>',
            url,
        )

    def get_urls(self):
        custom_urls = [
            path(
                "<int:object_id>/generate-seat-layout/",
                self.admin_site.admin_view(self.generate_seat_layout),
                name="movies_screen_generate_seat_layout",
            ),
        ]
        return custom_urls + super().get_urls()

    def generate_seat_layout(self, request, object_id):
        screen = get_object_or_404(Screen, pk=object_id)

        if not self.has_change_permission(request, screen):
            raise PermissionDenied

        if request.method == "POST":
            form = ScreenLayoutForm(request.POST)

            if form.is_valid():
                rows = form.cleaned_data["rows"]
                seats_per_row = form.cleaned_data["seats_per_row"]
                vip_rows = form.cleaned_data["vip_rows"]
                premium_rows = form.cleaned_data["premium_rows"]

                total_requested = rows * seats_per_row

                capacity = screen.capacity
                if capacity and total_requested > capacity:
                    form.add_error(
                        None,
                        f"This layout contains {total_requested} seats, "
                        f"but this screen's capacity is {capacity}. "
                        "Reduce the rows or seats per row, or update "
                        "the screen capacity first.",
                    )
                else:
                    existing_positions = set(
                        ScreenSeat.objects.filter(screen=screen).values_list(
                            "row", "number"
                        )
                    )

                    new_seats = []

                    for row_index in range(rows):
                        row_label = ascii_uppercase[row_index]

                        if row_index < vip_rows:
                            tier = "vip"
                        elif row_index < vip_rows + premium_rows:
                            tier = "premium"
                        else:
                            tier = "standard"

                        for seat_number in range(1, seats_per_row + 1):
                            position = (row_label, seat_number)

                            if position in existing_positions:
                                continue

                            new_seats.append(
                                ScreenSeat(
                                    screen=screen,
                                    row=row_label,
                                    number=seat_number,
                                    tier=tier,
                                    is_active=True,
                                )
                            )

                    try:
                        with transaction.atomic():
                            ScreenSeat.objects.bulk_create(new_seats)

                        created = len(new_seats)
                        skipped = total_requested - created

                        self.message_user(
                            request,
                            f"Layout processed for {screen}: "
                            f"{created} seat(s) created; "
                            f"{skipped} existing position(s) skipped.",
                            level=messages.SUCCESS,
                        )

                        return redirect(
                            reverse("admin:movies_screen_changelist")
                        )

                    except Exception:
                        form.add_error(
                            None,
                            "Seat generation failed. Check the server "
                            "terminal for the underlying database error.",
                        )
        else:
            form = ScreenLayoutForm()

        context = {
            **self.admin_site.each_context(request),
            "opts": self.model._meta,
            "title": f"Generate seat layout — {screen}",
            "screen": screen,
            "form": form,
        }

        return TemplateResponse(
            request,
            "admin/movies/screen/generate_seat_layout.html",
            context,
        )

@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("name", "state", "country", "is_active")
    list_filter = ("state", "country", "is_active")
    search_fields = ("name", "state")

@admin.register(ScreenSeat)
class ScreenSeatAdmin(admin.ModelAdmin):
    list_display = ("screen", "row", "number", "tier", "is_active")
    list_filter = ("screen", "tier", "is_active")
    search_fields = ("screen__name", "row")


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "genre",
        "language",
        "rating",
        "is_active",
        "is_featured",
    )
    list_filter = ("genre", "language", "is_active", "is_featured",)
    search_fields = ("title", "description")

    fields = (
        "title",
        "description",
        "poster_url",
        "backdrop_url",
        "trailer_url",
        "language",
        "genre",
        "duration_minutes",
        "release_date",
        "rating",
        "is_active",
        "is_featured"
    )

    actions = (
        "activate_movies",
        "deactivate_movies",
        "feature_selected_movie",
        "unfeature_movies",
    )

    @admin.action(description="Activate selected movies")
    def activate_movies(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f"{updated} movie(s) activated.",
            level=messages.SUCCESS,
        )

    @admin.action(description="Hide selected movies")
    def deactivate_movies(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f"{updated} movie(s) hidden from the public catalogue.",
            level=messages.SUCCESS,
        )

    @admin.action(description="Set selected movie as homepage featured")
    def feature_selected_movie(self, request, queryset):
        if queryset.count() != 1:
            self.message_user(
                request,
                "Select exactly one movie to feature.",
                level=messages.ERROR,
            )
            return

        movie = queryset.first()

        if not movie.is_active:
            self.message_user(
                request,
                "Activate the movie before featuring it.",
                level=messages.ERROR,
            )
            return

        with transaction.atomic():
            Movie.objects.exclude(pk=movie.pk).update(is_featured=False)
            Movie.objects.filter(pk=movie.pk).update(is_featured=True)

        self.message_user(
            request,
            f'"{movie.title}" is now the homepage featured movie.',
            level=messages.SUCCESS,
        )

    @admin.action(description="Remove homepage feature")
    def unfeature_movies(self, request, queryset):
        updated = queryset.update(is_featured=False)
        self.message_user(
            request,
            f"{updated} movie(s) removed from homepage featuring.",
            level=messages.SUCCESS,
        )

    def save_model(self, request, obj, form, change):
        if obj.is_featured:
            Movie.objects.filter(is_featured=True).exclude(
                pk=obj.pk
            ).update(is_featured=False)

        super().save_model(request, obj, form, change)

admin.site.register(Theatre)
admin.site.register(Seat)
admin.site.register(Booking)
admin.site.register(SeatHold)

@admin.register(Show)
class ShowAdmin(admin.ModelAdmin):

    form = ShowAdminForm

    list_display = (
        "movie",
        "screen",
        "start_time",
        "format",
        "standard_price",
        "show_seat_count",
        "is_active",
    )

    list_filter = (
        "format",
        "is_active",
        "start_time",
    )

    search_fields = (
        "movie__title",
        "screen__name",
        "screen__theatre__name",
    )

    autocomplete_fields = (
        "movie",
        "screen",
    )

    ordering = ("start_time",)

    @admin.display(description="Generated seats")
    def show_seat_count(self, obj):
        return obj.seats.count()

    def get_readonly_fields(self, request, obj=None):

        # Once a show exists, preserve its screen and
        # original inventory configuration.
        if obj:
            return (
                "movie",
                "screen",
                "start_time",
                "format",
                "standard_price",
                "premium_price",
                "vip_price",
            )

        return ()

    def save_model(self, request, obj, form, change):

        super().save_model(request, obj, form, change)

        if not change:
            generated_count = generate_seats_for_show(obj)

            self.message_user(
                request,
                (
                    f"Show created successfully. "
                    f"{generated_count} seats automatically generated "
                    f"for {obj.screen.name}."
                ),
                level=messages.SUCCESS,
            )
