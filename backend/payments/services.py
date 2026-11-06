import requests
from decimal import Decimal, InvalidOperation

from django.conf import settings


class CashfreeAPIError(Exception):
    pass


def get_cashfree_base_url():
    if settings.CASHFREE_ENV == "sandbox":
        return "https://sandbox.cashfree.com/pg"

    raise CashfreeAPIError(
        "Only Cashfree sandbox is enabled for this integration."
    )


def get_cashfree_headers():
    if not settings.CASHFREE_APP_ID or not settings.CASHFREE_SECRET_KEY:
        raise CashfreeAPIError(
            "Cashfree credentials are not configured."
        )

    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-client-id": settings.CASHFREE_APP_ID,
        "x-client-secret": settings.CASHFREE_SECRET_KEY,
        "x-api-version": settings.CASHFREE_API_VERSION,
    }


def parse_cashfree_response(response):
    try:
        data = response.json()
    except ValueError as exc:
        raise CashfreeAPIError(
            "Cashfree returned an invalid response."
        ) from exc

    if not response.ok:
        raise CashfreeAPIError(
            f"Cashfree API error: HTTP {response.status_code}"
        )

    return data


def create_cashfree_order(payment, customer_phone):

    url = f"{get_cashfree_base_url()}/orders"

    customer_details = {
        "customer_id": f"cmp_user_{payment.user_id}",
        "customer_phone": customer_phone,
    }

    if payment.user.email:
        customer_details["customer_email"] = payment.user.email

    if payment.user.get_full_name():
        customer_details["customer_name"] = (
            payment.user.get_full_name()
        )

    order_note = (
        f"ClaimMyPass movie booking {payment.booking.booking_id}"
        if payment.booking_id
        else "ClaimMyPass sandbox payment test"
    )

    payload = {
        "order_id": payment.order_id,
        "order_amount": float(payment.amount),
        "order_currency": payment.currency,
        "customer_details": customer_details,
        "order_note": order_note,
    }

    try:
        response = requests.post(
            url,
            json=payload,
            headers=get_cashfree_headers(),
            timeout=(5, 20),
        )
    except requests.RequestException as exc:
        raise CashfreeAPIError(
            "Could not connect to Cashfree."
        ) from exc

    data = parse_cashfree_response(response)

    if not data.get("payment_session_id"):
        raise CashfreeAPIError(
            "Cashfree did not return a payment session ID."
        )

    return data


def verify_cashfree_order(payment):

    url = (
        f"{get_cashfree_base_url()}/orders/"
        f"{payment.order_id}"
    )

    try:
        response = requests.get(
            url,
            headers=get_cashfree_headers(),
            timeout=(5, 20),
        )
    except requests.RequestException as exc:
        raise CashfreeAPIError(
            "Could not connect to Cashfree for verification."
        ) from exc

    data = parse_cashfree_response(response)

    # Verify that Cashfree returned the expected order.
    if data.get("order_id") != payment.order_id:
        raise CashfreeAPIError(
            "Cashfree order ID does not match the local order."
        )

    # Verify amount and currency.
    try:
        remote_amount = Decimal(
            str(data.get("order_amount"))
        ).quantize(Decimal("0.01"))

        if not remote_amount.is_finite():
            raise InvalidOperation

    except (InvalidOperation, TypeError, ValueError):
        raise CashfreeAPIError(
            "Cashfree returned an invalid order amount."
    )

    if remote_amount != payment.amount:
        raise CashfreeAPIError(
            "Payment amount does not match the local order."
        )

    if data.get("order_currency") != payment.currency:
        raise CashfreeAPIError(
            "Payment currency does not match the local order."
        )

    return data

def fetch_cashfree_payments(payment):
    """
    Fetch transaction details for a Cashfree order.
    """

    url = (
        f"{get_cashfree_base_url()}/orders/"
        f"{payment.order_id}/payments"
    )

    try:
        response = requests.get(
            url,
            headers=get_cashfree_headers(),
            timeout=(5, 20),
        )
    except requests.RequestException as exc:
        raise CashfreeAPIError(
            "Could not fetch Cashfree payment transactions."
        ) from exc

    data = parse_cashfree_response(response)

    if not isinstance(data, list):
        raise CashfreeAPIError(
            "Cashfree returned an invalid payment list."
        )

    for payment_record in data:
        if payment_record.get("order_id") != payment.order_id:
            raise CashfreeAPIError(
                "Cashfree payment order ID does not match."
            )

    return data