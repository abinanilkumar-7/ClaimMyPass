from django.urls import path

from .views import (
    SandboxTestOrderAPIView,
    SandboxVerifyOrderAPIView,
    MovieBookingOrderAPIView,
    MovieBookingVerifyAPIView,
    MyBookingsAPIView,
    TicketCheckInAPIView,
    StaffAccessAPIView
)


urlpatterns = [
    # Existing standalone ₹1 sandbox test.
    path(
        "sandbox-test-order/",
        SandboxTestOrderAPIView.as_view(),
        name="sandbox-test-order",
    ),
    path(
        "sandbox-test-order/verify/",
        SandboxVerifyOrderAPIView.as_view(),
        name="sandbox-verify-order",
    ),

    # Actual movie booking.
    path(
        "booking/create-order/",
        MovieBookingOrderAPIView.as_view(),
        name="movie-booking-create-order",
    ),
    path(
        "booking/verify/",
        MovieBookingVerifyAPIView.as_view(),
        name="movie-booking-verify",
    ),
    path(
        "my-bookings/",
        MyBookingsAPIView.as_view(),
        name="my-bookings",
    ),
    path(
        "tickets/check-in/",
        TicketCheckInAPIView.as_view(),
        name="ticket-check-in",
    ),
    path(
        "staff/access/",
        StaffAccessAPIView.as_view(),
        name="staff-access",
    ),
]