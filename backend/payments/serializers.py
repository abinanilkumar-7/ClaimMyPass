from rest_framework import serializers


class SandboxTestOrderSerializer(serializers.Serializer):
    customer_phone = serializers.RegexField(
        regex=r"^[6-9][0-9]{9}$",
        error_messages={
            "invalid": "Enter a valid 10-digit Indian mobile number."
        }
    )


class SandboxOrderVerificationSerializer(serializers.Serializer):
    order_id = serializers.CharField(
        max_length=45,
        required=True
    )

class MovieBookingOrderSerializer(serializers.Serializer):
    show_id = serializers.IntegerField(min_value=1)

    seat_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        min_length=1,
        max_length=8,
    )

    hold_token = serializers.UUIDField()

    customer_phone = serializers.RegexField(
        regex=r"^[6-9][0-9]{9}$",
        error_messages={
            "invalid": "Enter a valid 10-digit Indian mobile number."
        }
    )

    concessions = serializers.DictField(
        child=serializers.IntegerField(
            min_value=1,
            max_value=10,
        ),
        required=False,
        default=dict,
    )

    def validate_seat_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "Duplicate seat IDs are not allowed."
            )

        return value

    def validate_concessions(self, value):
        allowed_items = {
            "fnb-popcorn-truffle",
            "fnb-popcorn-caramel",
            "fnb-nacho-supremo",
            "fnb-combo-couples",
            "fnb-coldbrew-latte",
            "fnb-craft-soda",
        }

        invalid_items = set(value.keys()) - allowed_items

        if invalid_items:
            raise serializers.ValidationError(
                "One or more concession items are invalid."
            )

        return value


class BookingOrderVerificationSerializer(serializers.Serializer):
    order_id = serializers.CharField(
        max_length=45,
        required=True,
    )

class TicketCheckInSerializer(serializers.Serializer):
    token = serializers.CharField(
        max_length=255,
        required=True,
        trim_whitespace=True,
    )