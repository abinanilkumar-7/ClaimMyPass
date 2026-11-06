
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from movies.models import Show, Seat


class Command(BaseCommand):
    help = "Generate seat inventory for shows that do not have seats yet"

    def add_arguments(self, parser):
        parser.add_argument(
            "--rows",
            type=int,
            default=8,
            help="Number of seat rows (default: 8)",
        )
        parser.add_argument(
            "--seats-per-row",
            type=int,
            default=10,
            help="Seats per row (default: 10)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        rows = options["rows"]
        seats_per_row = options["seats_per_row"]

        if rows < 1 or seats_per_row < 1:
            raise CommandError("Rows and seats per row must be positive.")

        row_labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

        if rows > len(row_labels):
            raise CommandError("Maximum supported row count is 26.")

        shows = Show.objects.filter(is_active=True).select_related("screen")

        if not shows.exists():
            self.stdout.write(
                self.style.WARNING("No active shows found.")
            )
            return

        total_created = 0

        for show in shows:
            if Seat.objects.filter(show=show).exists():
                self.stdout.write(
                    f"Skipping show {show.id}: seats already exist."
                )
                continue

            seats = []

            for row_index in range(rows):
                row = row_labels[row_index]

                for number in range(1, seats_per_row + 1):
                    if row_index < 2:
                        tier = "vip"
                        price = show.vip_price
                    elif row_index < 4:
                        tier = "premium"
                        price = show.premium_price
                    else:
                        tier = "standard"
                        price = show.standard_price

                    seats.append(
                        Seat(
                            show=show,
                            row=row,
                            number=number,
                            tier=tier,
                            price=price,
                        )
                    )

            Seat.objects.bulk_create(seats)
            total_created += len(seats)

            self.stdout.write(
                f"Created {len(seats)} seats for show {show.id}."
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Finished. Created {total_created} seats."
            )
        )
