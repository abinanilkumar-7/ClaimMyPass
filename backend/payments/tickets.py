import uuid

from django.core.signing import BadSignature, Signer

from movies.models import Booking


TICKET_QR_SALT = "claimmypass.ticket.qr.v1"


def get_ticket_signer():
    """
    Return the dedicated signer for ClaimMyPass ticket QR codes.
    Uses Django's configured SECRET_KEY.
    """
    return Signer(
        salt=TICKET_QR_SALT,
        algorithm="sha256",
    )


def generate_ticket_qr_token(booking):
    """
    Generate an authentic signed token for a confirmed,
    successfully paid booking.
    """

    if booking.status != "CONFIRMED":
        raise ValueError("Only confirmed bookings can receive a ticket.")

    payment = getattr(booking, "payment", None)

    if payment is None or payment.status != "SUCCESS":
        raise ValueError("A successful payment is required.")

    return get_ticket_signer().sign(str(booking.booking_id))


def verify_ticket_qr_token(token):
    """
    Validate the signature and return the booking UUID.
    Returns None for invalid or tampered tokens.
    """

    if not isinstance(token, str) or not token:
        return None

    try:
        booking_id = get_ticket_signer().unsign(token)
        return str(uuid.UUID(booking_id))

    except (BadSignature, ValueError, TypeError, AttributeError):
        return None