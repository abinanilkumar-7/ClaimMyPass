from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):

    list_display = (
        "order_id",
        "user",
        "amount",
        "currency",
        "status",
        "created_at",
    )

    list_filter = ("status", "currency", "created_at")

    search_fields = (
        "order_id",
        "cashfree_order_id",
        "cashfree_payment_id",
        "user__email",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "gateway_response",
    )