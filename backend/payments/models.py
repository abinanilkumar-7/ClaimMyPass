from django.conf import settings
from django.db import models


class Payment(models.Model):

    class PaymentStatus(models.TextChoices):
        CREATED = "CREATED", "Created"
        PENDING = "PENDING", "Pending"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"
        EXPIRED = "EXPIRED", "Expired"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payments"
    )

    booking = models.OneToOneField(
        "movies.Booking",
        on_delete=models.PROTECT,
        related_name="payment",
        null=True,
        blank=True,
    )

    order_id = models.CharField(
        max_length=45,
        unique=True
    )

    cashfree_order_id = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    payment_session_id = models.TextField(
        blank=True,
        null=True
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    currency = models.CharField(
        max_length=3,
        default="INR"
    )

    status = models.CharField(
        max_length=10,
        choices=PaymentStatus.choices,
        default=PaymentStatus.CREATED
    )

    cashfree_payment_id = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    gateway_response = models.JSONField(
        default=dict,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.order_id} - {self.status}"

    class Meta:
        ordering = ["-created_at"]