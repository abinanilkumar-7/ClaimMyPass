
from django.db import transaction

from .models import ScreenSeat, Seat, Show


@transaction.atomic
def generate_seats_for_show(show):
    """Generate missing show-specific seats from the screen layout."""

    layout_seats = list(
        ScreenSeat.objects.filter(
            screen=show.screen,
            is_active=True,
        ).order_by("row", "number")
    )

    if not layout_seats:
        raise ValueError(
            f"No active seat layout configured for "
            f"{show.screen.theatre.name} - {show.screen.name}."
        )

    existing_positions = set(
        Seat.objects.filter(show=show).values_list("row", "number")
    )

    new_seats = []

    for layout_seat in layout_seats:
        position = (layout_seat.row, layout_seat.number)

        if position in existing_positions:
            continue

        if layout_seat.tier == "vip":
            price = show.vip_price
        elif layout_seat.tier == "premium":
            price = show.premium_price
        else:
            price = show.standard_price

        new_seats.append(
            Seat(
                show=show,
                row=layout_seat.row,
                number=layout_seat.number,
                tier=layout_seat.tier,
                price=price,
            )
        )

    if new_seats:
        Seat.objects.bulk_create(new_seats)

    return len(new_seats)


@transaction.atomic
def create_show_with_seats(
    *,
    movie,
    screen,
    start_time,
    show_format,
    standard_price,
    premium_price,
    vip_price,
):
    """Create a show and its seats within one database transaction."""

    has_layout = ScreenSeat.objects.filter(
        screen=screen,
        is_active=True,
    ).exists()

    if not has_layout:
        raise ValueError(
            f"No active seat layout configured for "
            f"{screen.theatre.name} - {screen.name}."
        )

    show = Show.objects.create(
        movie=movie,
        screen=screen,
        start_time=start_time,
        format=show_format,
        standard_price=standard_price,
        premium_price=premium_price,
        vip_price=vip_price,
    )

    generate_seats_for_show(show)

    return show
