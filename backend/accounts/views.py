
from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.conf import settings
from django.contrib.auth.forms import SetPasswordForm
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode


from .serializers import RegisterSerializer

User = get_user_model()


def user_response(user):
    return {
        "id": user.id,
        "name": user.first_name,
        "email": user.email,
    }


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "message": "Account created successfully.",
                "token": token.key,
                "user": user_response(user),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get("email", "")
        password = request.data.get("password", "")

        if not isinstance(email, str) or not isinstance(password, str):
            return Response(
                {"detail": "Enter a valid email and password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = email.strip().lower()

        if not email or not password:
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_record = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            user_record = None

        user = (
            authenticate(
                request,
                username=user_record.username,
                password=password,
            )
            if user_record is not None
            else None
        )

        if user is None or not user.is_active:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            "message": "Login successful.",
            "token": token.key,
            "user": user_response(user),
        })


class LogoutAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.auth.delete()

        return Response(
            {"message": "Logged out successfully."},
            status=status.HTTP_200_OK,
        )


class ProfileAPIView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(user_response(request.user))

class PasswordResetRequestAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get("email", "")

        if not isinstance(email, str) or not email.strip():
            return Response(
                {"message": "If an account exists for that email, a reset link will be sent."},
                status=status.HTTP_200_OK,
            )

        email = email.strip()

        users = User.objects.filter(
            email__iexact=email,
            is_active=True,
        )

        for user in users:
            if not user.has_usable_password():
                continue

            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            reset_url = (
                f"http://localhost:3000/reset-password"
                f"?uid={uid}&token={token}"
            )

            print("PASSWORD RESET EMAIL SENDER:", repr(settings.DEFAULT_FROM_EMAIL),)

            send_mail(
                subject="Reset your ClaimMyPass password",
                message=(
                    "We received a request to reset your ClaimMyPass password.\n\n"
                    f"Use this link to choose a new password:\n{reset_url}\n\n"
                    "If you did not request this, you can ignore this email."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

        # Deliberately return the same response whether or not the email exists.
        return Response(
            {
                "message": (
                    "If an account exists for that email, "
                    "a reset link will be sent."
                )
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        uid = request.data.get("uid", "")
        token = request.data.get("token", "")
        password = request.data.get("password", "")
        password_confirm = request.data.get("password_confirm", "")

        if not all(
            isinstance(value, str) and value
            for value in (uid, token, password, password_confirm)
        ):
            return Response(
                {"detail": "All fields are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if password != password_confirm:
            return Response(
                {"password_confirm": ["The passwords do not match."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"detail": "This reset link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "This reset link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use Django's configured password validators.
        form = SetPasswordForm(
            user,
            {
                "new_password1": password,
                "new_password2": password_confirm,
            },
        )

        if not form.is_valid():
            errors = form.errors.get("new_password2") or form.errors.get("new_password1")
            return Response(
                {"detail": list(errors) if errors else "Choose a stronger password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        form.save()

        # Invalidate existing API tokens so the user must sign in again.
        Token.objects.filter(user=user).delete()

        return Response(
            {"message": "Password reset successfully. Please sign in."},
            status=status.HTTP_200_OK,
        )