
from django.db import transaction

from movies.models import Screen, ScreenSeat


def create_layout(screen):
    if ScreenSeat.objects.filter(screen=screen).exists():
        print(f"Layout already exists: {screen.theatre.name} - {screen.name}")
        return

    seats = []

    for row_index, row in enumerate("ABCDEFGH"):
        for number in range(1, 11):
            if row_index < 2:
                tier = "vip"
            elif row_index < 5:
                tier = "premium"
            else:
                tier = "standard"

            seats.append(
                ScreenSeat(
                    screen=screen,
                    row=row,
                    number=number,
                    tier=tier,
                    is_active=True,
                )
            )

    ScreenSeat.objects.bulk_create(seats)

    print(f"Created {len(seats)} seats for {screen.theatre.name} - {screen.name}")


with transaction.atomic():
    target_screens = Screen.objects.filter(
        theatre__name="Sree Kaleeshwary Sree Saraswathi",
        name="Screen 1",
    ) | Screen.objects.filter(
        theatre__name="PVR Cinemas",
        name="Screen 2",
    )

    for screen in target_screens.select_related("theatre"):
        create_layout(screen)

    if not target_screens.exists():
        print("No matching screens found. Check the theatre and screen names.")
