import logging
import hashlib
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from uuid import uuid4

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from movies.models import Booking, Seat, SeatHold, Show

from .models import Payment

from .tickets import (
    generate_ticket_qr_token,
    verify_ticket_qr_token,
)

from .serializers import (
    SandboxTestOrderSerializer,
    SandboxOrderVerificationSerializer,
    MovieBookingOrderSerializer,
    BookingOrderVerificationSerializer,
    TicketCheckInSerializer,
)

from .services import (
    create_cashfree_order,
    verify_cashfree_order,
    fetch_cashfree_payments,
    CashfreeAPIError,
)


logger = logging.getLogger(__name__)


class SandboxTestOrderAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):

        # This endpoint is strictly for local sandbox testing.
        if not settings.DEBUG or settings.CASHFREE_ENV != "sandbox":
            return Response(
                {"detail": "Sandbox test endpoint is disabled."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = SandboxTestOrderSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not settings.CASHFREE_APP_ID or not settings.CASHFREE_SECRET_KEY:
            return Response(
                {"detail": "Cashfree credentials are not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not request.user.email:
            return Response(
                {"detail": "Your account needs an email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            amount = Decimal(
                str(settings.CASHFREE_TEST_AMOUNT)
            ).quantize(Decimal("0.01"))

        except InvalidOperation:
            return Response(
                {"detail": "Invalid sandbox test amount configuration."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if amount < Decimal("1.00"):
            return Response(
                {"detail": "Cashfree test amount must be at least INR 1."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        order_id = f"CMPTEST_{uuid4().hex}"

        payment = Payment.objects.create(
            user=request.user,
            order_id=order_id,
            amount=amount,
            currency="INR",
            status=Payment.PaymentStatus.CREATED,
        )

        try:
            cashfree_response = create_cashfree_order(
                payment=payment,
                customer_phone=serializer.validated_data["customer_phone"],
            )

        except CashfreeAPIError:
            logger.exception(
                "Cashfree sandbox order creation failed: %s",
                payment.order_id,
            )

            return Response(
                {
                    "detail": (
                        "Cashfree could not create the test order. "
                        "Check the Django terminal logs."
                    ),
                    "order_id": payment.order_id,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payment.cashfree_order_id = str(
            cashfree_response.get("cf_order_id", "")
        )

        payment.payment_session_id = cashfree_response[
            "payment_session_id"
        ]

        payment.gateway_response = {
            "order_status": cashfree_response.get("order_status"),
            "created_at": cashfree_response.get("created_at"),
        }

        payment.save(
            update_fields=[
                "cashfree_order_id",
                "payment_session_id",
                "gateway_response",
                "updated_at",
            ]
        )

        return Response(
            {
                "message": "Cashfree sandbox order created successfully.",
                "order_id": payment.order_id,
                "cashfree_order_id": payment.cashfree_order_id,
                "payment_session_id": payment.payment_session_id,
                "amount": str(payment.amount),
                "currency": payment.currency,
                "status": payment.status,
            },
            status=status.HTTP_201_CREATED,
        )

class SandboxVerifyOrderAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):

        # Sandbox-only protection
        if not settings.DEBUG or settings.CASHFREE_ENV != "sandbox":
            return Response(
                {"detail": "Sandbox verification is disabled."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = SandboxOrderVerificationSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Only allow users to verify their own orders.
        payment = get_object_or_404(
            Payment,
            order_id=serializer.validated_data["order_id"],
            user=request.user,
        )

        try:
            cashfree_order = verify_cashfree_order(payment)

        except CashfreeAPIError:
            logger.exception(
                "Cashfree verification failed for order: %s",
                payment.order_id,
            )

            return Response(
                {
                    "detail": "Unable to verify payment with Cashfree."
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        cashfree_status = cashfree_order.get("order_status")

        status_mapping = {
            "PAID": Payment.PaymentStatus.SUCCESS,
            "ACTIVE": Payment.PaymentStatus.PENDING,
            "EXPIRED": Payment.PaymentStatus.EXPIRED,
            "TERMINATED": Payment.PaymentStatus.FAILED,
        }

        new_status = status_mapping.get(
            cashfree_status,
            Payment.PaymentStatus.PENDING,
        )

        # A successful payment must never be downgraded.
        if payment.status != Payment.PaymentStatus.SUCCESS:
            payment.status = new_status

        payment.cashfree_order_id = str(
            cashfree_order.get(
                "cf_order_id",
                payment.cashfree_order_id or "",
            )
        )

        payment.gateway_response = {
            "order_status": cashfree_status,
            "cf_order_id": cashfree_order.get("cf_order_id"),
            "order_amount": cashfree_order.get("order_amount"),
            "order_currency": cashfree_order.get("order_currency"),
        }

        payment.save(
            update_fields=[
                "status",
                "cashfree_order_id",
                "gateway_response",
                "updated_at",
            ]
        )

        return Response(
            {
                "order_id": payment.order_id,
                "status": payment.status,
                "cashfree_order_status": cashfree_status,
                "amount": str(payment.amount),
                "currency": payment.currency,
                "verified": (
                    payment.status == Payment.PaymentStatus.SUCCESS
                ),
            },
            status=status.HTTP_200_OK,
        )

CONCESSION_CATALOGUE = {
    "fnb-popcorn-truffle": {
        "name": "Black Truffle Gourmet Popcorn (Large)",
        "price": Decimal("360.00"),
    },
    "fnb-popcorn-caramel": {
        "name": "Artisanal Caramel Crunch Popcorn",
        "price": Decimal("340.00"),
    },
    "fnb-nacho-supremo": {
        "name": "Nacho Grande with Warm Queso Dip",
        "price": Decimal("320.00"),
    },
    "fnb-combo-couples": {
        "name": "Blockbuster Duo Combo",
        "price": Decimal("680.00"),
    },
    "fnb-coldbrew-latte": {
        "name": "Artisan Cold Brew Iced Coffee",
        "price": Decimal("240.00"),
    },
    "fnb-craft-soda": {
        "name": "Sparkling Yuzu Blood Orange Cooler",
        "price": Decimal("220.00"),
    },
}


def calculate_booking_amount(seats, concessions):
    """
    Calculate the authoritative booking total using Django data.
    """

    subtotal_tickets = sum(
        (seat.price for seat in seats),
        Decimal("0.00"),
    )

    subtotal_concessions = Decimal("0.00")
    concessions_snapshot = []

    for item_id, quantity in concessions.items():
        item = CONCESSION_CATALOGUE[item_id]

        unit_price = item["price"]
        item_total = unit_price * quantity

        subtotal_concessions += item_total

        concessions_snapshot.append({
            "id": item_id,
            "name": item["name"],
            "quantity": quantity,
            "unit_price": str(unit_price),
            "total_price": str(item_total),
        })

    convenience_fee = Decimal(len(seats) * 34)

    taxable_amount = (
        subtotal_tickets
        + subtotal_concessions
        + convenience_fee
    )

    # Match the frontend's Math.round(... * 0.18).
    taxes = (
        taxable_amount * Decimal("0.18")
    ).quantize(
        Decimal("1"),
        rounding=ROUND_HALF_UP,
    )

    total_amount = (
        taxable_amount + taxes
    ).quantize(Decimal("0.01"))

    return {
        "subtotal_tickets": subtotal_tickets,
        "subtotal_concessions": subtotal_concessions,
        "convenience_fee": convenience_fee,
        "taxes": taxes,
        "total_amount": total_amount,
        "concessions": concessions_snapshot,
    }

class MovieBookingOrderAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    max_seats_per_booking = 8

    def post(self, request):

        serializer = MovieBookingOrderSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        if settings.CASHFREE_ENV != "sandbox":
            return Response(
                {"detail": "Only sandbox payments are enabled."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not settings.CASHFREE_APP_ID or not settings.CASHFREE_SECRET_KEY:
            return Response(
                {"detail": "Cashfree credentials are not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not request.user.email:
            return Response(
                {"detail": "Your account needs an email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        show_id = data["show_id"]
        seat_ids = data["seat_ids"]
        hold_token = data["hold_token"]
        customer_phone = data["customer_phone"]
        concessions = data["concessions"]

        now = timezone.now()

        # Reserve the booking and associate the existing seat holds.
        try:
            with transaction.atomic():

                show = (
                    Show.objects
                    .select_for_update()
                    .select_related(
                        "movie",
                        "screen",
                        "screen__theatre",
                    )
                    .filter(
                        id=show_id,
                        is_active=True,
                        movie__is_active=True,
                        screen__is_active=True,
                        screen__theatre__is_active=True,
                        start_time__gt=now,
                    )
                    .first()
                )

                if not show:
                    return Response(
                        {"detail": "This show is unavailable."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                seats = list(
                    Seat.objects
                    .select_for_update()
                    .filter(
                        show=show,
                        id__in=seat_ids,
                    )
                    .order_by("id")
                )

                if len(seats) != len(seat_ids):
                    return Response(
                        {
                            "detail": (
                                "One or more selected seats "
                                "do not belong to this show."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Retrieve every active hold created by this token.
                holds = list(
                    SeatHold.objects
                    .select_for_update()
                    .filter(
                        hold_token=hold_token,
                        seat__show=show,
                    )
                    .select_related("seat")
                )

                held_seat_ids = {
                    hold.seat_id for hold in holds
                }

                if (
                    held_seat_ids != set(seat_ids)
                    or any(
                        hold.expires_at <= now
                        or hold.booking_id is not None
                        for hold in holds
                    )
                ):
                    return Response(
                        {
                            "detail": (
                                "Your seat hold is expired, "
                                "invalid or already associated "
                                "with another booking. "
                                "Please select your seats again."
                            )
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

                # Final check against already confirmed bookings.
                booked_ids = set()

                for confirmed_booking in Booking.objects.filter(
                    show=show,
                    status="CONFIRMED",
                ).only("seat_ids"):
                    booked_ids.update(
                        confirmed_booking.seat_ids or []
                    )

                if booked_ids.intersection(seat_ids):
                    return Response(
                        {
                            "detail": (
                                "One or more selected seats "
                                "have already been booked."
                            )
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

                pricing = calculate_booking_amount(
                    seats,
                    concessions,
                )

                amount = pricing["total_amount"]

                if amount < Decimal("1.00"):
                    return Response(
                        {"detail": "Invalid booking amount."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                customer_name = (
                    request.user.get_full_name()
                    or request.user.get_username()
                )

                booking = Booking.objects.create(
                    user=request.user,
                    show=show,
                    customer_name=customer_name,
                    customer_email=request.user.email,
                    customer_phone=customer_phone,
                    seat_ids=seat_ids,
                    concessions=pricing["concessions"],
                    subtotal_tickets=pricing["subtotal_tickets"],
                    subtotal_concessions=pricing["subtotal_concessions"],
                    convenience_fee=pricing["convenience_fee"],
                    taxes=pricing["taxes"],
                    total_amount=amount,
                    status="PENDING",
                    hold_expires_at=min(
                        hold.expires_at for hold in holds
                    ),
                )

                # Attach the held seats to this booking.
                SeatHold.objects.filter(
                    id__in=[hold.id for hold in holds]
                ).update(booking=booking)

                order_id = f"CMPBOOK_{uuid4().hex}"

                payment = Payment.objects.create(
                    user=request.user,
                    booking=booking,
                    order_id=order_id,
                    amount=amount,
                    currency="INR",
                    status=Payment.PaymentStatus.CREATED,
                )

        except Exception:
            logger.exception("Movie booking order preparation failed.")

            return Response(
                {"detail": "Unable to prepare your booking."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Call Cashfree after the database transaction commits.
        try:
            cashfree_response = create_cashfree_order(
                payment=payment,
                customer_phone=customer_phone,
            )

        except CashfreeAPIError:
            logger.exception(
                "Cashfree booking order creation failed: %s",
                payment.order_id,
            )

            with transaction.atomic():
                Payment.objects.filter(id=payment.id).update(
                    status=Payment.PaymentStatus.FAILED
                )

                Booking.objects.filter(id=booking.id).update(
                    status="CANCELLED"
                )

                SeatHold.objects.filter(
                    booking=booking
                ).delete()

            return Response(
                {
                    "detail": (
                        "Cashfree could not create your booking payment. "
                        "Please select your seats again."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payment.cashfree_order_id = str(
            cashfree_response.get("cf_order_id", "")
        )

        payment.payment_session_id = (
            cashfree_response["payment_session_id"]
        )

        payment.gateway_response = {
            "order_status": cashfree_response.get("order_status"),
            "created_at": cashfree_response.get("created_at"),
        }

        payment.save(
            update_fields=[
                "cashfree_order_id",
                "payment_session_id",
                "gateway_response",
                "updated_at",
            ]
        )

        return Response(
            {
                "message": "Movie booking payment order created.",
                "booking_id": str(booking.booking_id),
                "order_id": payment.order_id,
                "cashfree_order_id": payment.cashfree_order_id,
                "payment_session_id": payment.payment_session_id,
                "amount": str(payment.amount),
                "currency": payment.currency,
                "status": payment.status,
                "booking_status": booking.status,
                "price_breakdown": {
                    key: str(pricing[key])
                    for key in (
                        "subtotal_tickets",
                        "subtotal_concessions",
                        "convenience_fee",
                        "taxes",
                        "total_amount",
                    )
                },
            },
            status=status.HTTP_201_CREATED,
        )

class MovieBookingVerifyAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):

        if settings.CASHFREE_ENV != "sandbox":
            return Response(
                {"detail": "Sandbox verification is disabled."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = BookingOrderVerificationSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment = get_object_or_404(
            Payment.objects.select_related("booking"),
            order_id=serializer.validated_data["order_id"],
            user=request.user,
            booking__isnull=False,
        )

        try:
            cashfree_order = verify_cashfree_order(payment)
            cashfree_payments = fetch_cashfree_payments(payment)

        except CashfreeAPIError:
            logger.exception(
                "Movie booking verification failed: %s",
                payment.order_id,
            )

            return Response(
                {"detail": "Unable to verify payment with Cashfree."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        cashfree_status = cashfree_order.get("order_status")

        # Accept only a successful transaction matching
        # the exact order amount and currency.
        successful_payment = None

        for record in cashfree_payments:
            if record.get("payment_status") != "SUCCESS":
                continue

            try:
                transaction_amount = Decimal(
                    str(record.get("payment_amount"))
                ).quantize(Decimal("0.01"))
            except (InvalidOperation, TypeError, ValueError):
                continue

            if (
                transaction_amount == payment.amount
                and record.get("payment_currency") == payment.currency
            ):
                successful_payment = record
                break

        payment_is_successful = (
            cashfree_status == "PAID"
            and successful_payment is not None
        )

        now = timezone.now()
        booking_issue = None

        with transaction.atomic():

            locked_payment = (
                Payment.objects
                .select_for_update()
                .get(pk=payment.pk)
            )

            booking = (
                Booking.objects
                .select_for_update()
                .get(pk=locked_payment.booking_id)
            )

            # Serialize booking confirmation for this show.
            Show.objects.select_for_update().get(
                pk=booking.show_id
            )

            if payment_is_successful:

                locked_payment.status = Payment.PaymentStatus.SUCCESS

                locked_payment.cashfree_payment_id = str(
                    successful_payment.get("cf_payment_id", "")
                )

                if booking.status == "PENDING":

                    holds = list(
                        SeatHold.objects
                        .select_for_update()
                        .filter(booking=booking)
                    )

                    held_ids = {
                        hold.seat_id for hold in holds
                    }

                    expected_ids = set(booking.seat_ids or [])

                    holds_are_valid = (
                        booking.hold_expires_at is not None
                        and booking.hold_expires_at > now
                        and held_ids == expected_ids
                        and all(
                            hold.expires_at > now
                            for hold in holds
                        )
                    )

                    already_booked_ids = set()

                    confirmed_bookings = Booking.objects.filter(
                        show=booking.show,
                        status="CONFIRMED",
                    ).exclude(
                        pk=booking.pk
                    ).only("seat_ids")

                    for other_booking in confirmed_bookings:
                        already_booked_ids.update(
                            other_booking.seat_ids or []
                        )

                    if (
                        holds_are_valid
                        and not expected_ids.intersection(
                            already_booked_ids
                        )
                    ):
                        booking.status = "CONFIRMED"
                        booking.confirmed_at = now

                        booking.save(
                            update_fields=[
                                "status",
                                "confirmed_at",
                            ]
                        )

                        # Confirmed booking now protects the seats.
                        SeatHold.objects.filter(
                            booking=booking
                        ).delete()

                    else:
                        booking.status = "EXPIRED"

                        booking.save(
                            update_fields=["status"]
                        )

                        SeatHold.objects.filter(
                            booking=booking
                        ).delete()

                        booking_issue = (
                            "Payment succeeded, but the seat hold "
                            "could not be confirmed. No ticket was "
                            "issued. Please contact support for "
                            "payment resolution."
                        )

            else:

                # Never downgrade an already successful payment.
                if (
                    locked_payment.status
                    != Payment.PaymentStatus.SUCCESS
                ):

                    if cashfree_status == "EXPIRED":
                        locked_payment.status = (
                            Payment.PaymentStatus.EXPIRED
                        )

                        if booking.status == "PENDING":
                            booking.status = "EXPIRED"

                    elif cashfree_status == "TERMINATED":
                        locked_payment.status = (
                            Payment.PaymentStatus.FAILED
                        )

                        if booking.status == "PENDING":
                            booking.status = "CANCELLED"

                if booking.status in ("EXPIRED", "CANCELLED"):
                    booking.save(update_fields=["status"])

                    SeatHold.objects.filter(
                        booking=booking
                    ).delete()

            locked_payment.gateway_response = {
                "order_status": cashfree_status,
                "payment_status": (
                    successful_payment.get("payment_status")
                    if successful_payment else None
                ),
                "cf_payment_id": (
                    successful_payment.get("cf_payment_id")
                    if successful_payment else None
                ),
                "booking_confirmation_issue": booking_issue,
            }

            locked_payment.save(
                update_fields=[
                    "status",
                    "cashfree_payment_id",
                    "gateway_response",
                    "updated_at",
                ]
            )

        return Response(
            {
                "order_id": locked_payment.order_id,
                "booking_id": str(booking.booking_id),
                "payment_status": locked_payment.status,
                "booking_status": booking.status,
                "verified": (
                    locked_payment.status
                    == Payment.PaymentStatus.SUCCESS
                ),
                "pass_ready": booking.status == "CONFIRMED",
                "message": (
                    booking_issue
                    or (
                        "Payment verified and booking confirmed."
                        if booking.status == "CONFIRMED"
                        else "Payment is not yet confirmed."
                    )
                ),
            },
            status=status.HTTP_200_OK,
        )

def build_booking_pass(booking):
    """
    Convert a confirmed Django booking into the existing
    frontend BookingPass structure.
    """

    movie = booking.show.movie
    screen = booking.show.screen
    theatre = screen.theatre
    show = booking.show

    local_show_time = timezone.localtime(show.start_time)

    seats = Seat.objects.filter(
        show=show,
        id__in=booking.seat_ids,
    ).order_by("row", "number")

    payment = booking.payment

    # Stable QR reference derived from the persistent booking UUID.
    reference_digest = hashlib.sha256(
        str(booking.booking_id).encode("utf-8")
    ).hexdigest()

    concession_categories = {
        "fnb-popcorn-truffle": ("Popcorn", "🍿"),
        "fnb-popcorn-caramel": ("Popcorn", "🍿"),
        "fnb-nacho-supremo": ("Snacks", "🧀"),
        "fnb-combo-couples": ("Combos", "🎬"),
        "fnb-coldbrew-latte": ("Beverages", "☕"),
        "fnb-craft-soda": ("Beverages", "🥤"),
    }

    concessions = []

    for item in booking.concessions or []:
        item_id = item["id"]
        category, emoji = concession_categories.get(
            item_id,
            ("Snacks", "🍿"),
        )

        concessions.append({
            "item": {
                "id": item_id,
                "name": item["name"],
                "category": category,
                "description": "",
                "price": float(item["unit_price"]),
                "imageEmoji": emoji,
                "isVeg": True,
            },
            "quantity": item["quantity"],
        })

    return {
        "bookingId": f"CMP-{booking.booking_id}",
        "referenceHash": f"SHA256-{reference_digest}",
        "qrToken": generate_ticket_qr_token(booking),

        "movie": {
            "id": str(movie.id),
            "title": movie.title,
            "tagline": "",
            "genre": [movie.get_genre_display()],
            "durationMinutes": movie.duration_minutes,
            "rating": float(movie.rating),
            "certification": "",
            "releaseDate": (
                movie.release_date.isoformat()
                if movie.release_date else ""
            ),
            "synopsis": movie.description,
            "director": "",
            "cast": [],
            "languages": [movie.language],
            "formats": [show.format],
            "posterUrl": movie.poster_url,
            "backdropUrl": movie.backdrop_url,
            "isFeatured": movie.is_featured,
        },

        "theatre": {
            "id": str(theatre.id),
            "name": theatre.name,
            "chain": "",
            "city": theatre.city.name,
            "location": theatre.address,
            "distanceKm": 0,
            "facilities": [],
        },

        "show": {
            "id": str(show.id),
            "movieId": str(movie.id),
            "theatreId": str(theatre.id),
            "screenName": screen.name,
            "format": show.format,
            "date": local_show_time.strftime("%Y-%m-%d"),
            "time": local_show_time.strftime("%I:%M %p"),
            "basePrice": float(show.standard_price),
            "pricing": {
                "standard": float(show.standard_price),
                "premium": float(show.premium_price),
                "vip": float(show.vip_price),
            },
        },

        "seats": [
            {
                "id": f"{seat.row}{seat.number}",
                "backendId": seat.id,
                "row": seat.row,
                "number": seat.number,
                "tier": seat.tier,
                "price": float(seat.price),
                "status": "booked",
            }
            for seat in seats
        ],

        "concessions": concessions,

        "subtotalTickets": float(booking.subtotal_tickets),
        "subtotalConcessions": float(booking.subtotal_concessions),
        "convenienceFee": float(booking.convenience_fee),
        "taxes": float(booking.taxes),
        "totalPaid": float(booking.total_amount),

        "bookedAt": (
            booking.confirmed_at or booking.created_at
        ).isoformat(),

        "paymentMethod": "Cashfree",
        "paymentId": payment.cashfree_payment_id or payment.order_id,

        "customerName": booking.customer_name,
        "customerPhone": booking.customer_phone,
        "customerEmail": booking.customer_email,
    }


class MyBookingsAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):

        bookings = (
            Booking.objects
            .filter(
                user=request.user,
                status="CONFIRMED",
            )
            .select_related(
                "show__movie",
                "show__screen",
                "show__screen__theatre",
                "show__screen__theatre__city",
                "payment",
            )
            .order_by("-confirmed_at", "-created_at")
        )

        passes = [
            build_booking_pass(booking)
            for booking in bookings
        ]

        return Response(
            {
                "count": len(passes),
                "results": passes,
            },
            status=status.HTTP_200_OK,
        )

class TicketCheckInAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = TicketCheckInSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify the QR signature before accessing the booking.
        booking_uuid = verify_ticket_qr_token(
            serializer.validated_data["token"]
        )

        if not booking_uuid:
            return Response(
                {
                    "valid": False,
                    "detail": "Invalid ticket QR code.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            try:
                booking = (
                    Booking.objects
                    .select_for_update()
                    .select_related(
                        "show__movie",
                        "show__screen",
                        "show__screen__theatre",
                    )
                    .get(booking_id=booking_uuid)
                )
            except Booking.DoesNotExist:
                return Response(
                    {
                        "valid": False,
                        "detail": "Invalid ticket QR code.",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # A valid signature alone does not mean a valid booking.
            if booking.status != "CONFIRMED":
                return Response(
                    {
                        "valid": False,
                        "detail": "This booking is not confirmed.",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            # Confirm that the associated payment is successful.
            try:
                payment = booking.payment
            except Payment.DoesNotExist:
                payment = None

            if (
                payment is None
                or payment.status != Payment.PaymentStatus.SUCCESS
                or payment.amount != booking.total_amount
                or payment.currency != "INR"
            ):
                return Response(
                    {
                        "valid": False,
                        "detail": "Payment verification failed.",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            # Prevent duplicate entry.
            if booking.checked_in_at is not None:
                return Response(
                    {
                        "valid": False,
                        "already_used": True,
                        "detail": "This ticket has already been used.",
                        "checked_in_at": booking.checked_in_at.isoformat(),
                        "checked_in_by": (
                            booking.checked_in_by.get_username()
                            if booking.checked_in_by else None
                        ),
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            # Atomically record the first successful check-in.
            now = timezone.now()

            booking.checked_in_at = now
            booking.checked_in_by = request.user

            booking.save(
                update_fields=[
                    "checked_in_at",
                    "checked_in_by",
                ]
            )

            return Response(
                {
                    "valid": True,
                    "already_used": False,
                    "detail": "Ticket verified. Entry authorized.",
                    "booking_id": f"CMP-{booking.booking_id}",
                    "movie": booking.show.movie.title,
                    "theatre": booking.show.screen.theatre.name,
                    "screen": booking.show.screen.name,
                    "seats": [
                        f"{seat.row}{seat.number}"
                        for seat in Seat.objects.filter(
                            show=booking.show,
                            id__in=booking.seat_ids,
                        ).order_by("row", "number")
                    ],
                    "checked_in_at": now.isoformat(),
                    "checked_in_by": request.user.get_username(),
                },
                status=status.HTTP_200_OK,
            )

class StaffAccessAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(
            {
                "authorized": True,
                "username": request.user.get_username(),
                "message": "Staff access verified.",
            },
            status=status.HTTP_200_OK,
        )