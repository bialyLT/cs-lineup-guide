import logging

from django.conf import settings
from django.contrib.auth import authenticate
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.progression.services import create_initial_progression

from .models import EmailVerification, User
from .serializers import RegisterSerializer, UserSerializer
from .services import (
    VerificationError,
    send_verification_email,
    using_console_backend,
    verify_email_code,
)

logger = logging.getLogger(__name__)


def _tokens_for(user: User) -> dict[str, str]:
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def _authenticate_by_username_or_email(identifier: str, password: str) -> User | None:
    """Autentica por username o email (Django solo sabe hacerlo por username)."""
    user = authenticate(username=identifier, password=password)
    if user is not None:
        return user
    try:
        candidate = User.objects.get(email__iexact=identifier)
    except User.DoesNotExist:
        return None
    return authenticate(username=candidate.username, password=password)


def _unique_username(base: str) -> str:
    """Username único a partir del prefijo del email de Google."""
    clean = "".join(ch for ch in base if ch.isalnum() or ch in "._-")
    username = (clean or "player")[:30]
    candidate = username
    suffix = 1
    while User.objects.filter(username=candidate).exists():
        suffix += 1
        tail = str(suffix)
        candidate = f"{username[: 30 - len(tail)]}{tail}"
    return candidate


class RegisterView(APIView):
    """Crea la cuenta con usuario y contraseña (sin email todavía).

    Se emiten los JWT pero la cuenta no puede acceder a los datos hasta
    verificar el email (permitido por IsVerifiedUser). El siguiente paso de
    la app es adjuntar un email (/auth/me/email/) y verificar el código.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        create_initial_progression(user)

        data = {"user": UserSerializer(user).data, **_tokens_for(user)}
        return Response(data, status=status.HTTP_201_CREATED)


class AddEmailView(APIView):
    """POST /api/auth/me/email/  { email } (autenticado, sin verificar aún)

    Adjunta el email a la cuenta y envía el código de verificación. Valida
    que el email no pertenezca a otra cuenta registrada.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response(
                {"detail": "Indicá tu email."}, status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
            return Response(
                {"detail": "Ya hay una cuenta con este email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.email != email:
            user.email = email
            user.save(update_fields=["email"])

        try:
            send_verification_email(user)
        except VerificationError as exc:
            return Response(
                {"detail": str(exc), "code": exc.code},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        data = {
            "detail": "Enviamos un código de verificación a tu email.",
            "email": user.email,
            "dev_code": user.email_verification.code if using_console_backend() else None,
        }
        return Response(data)


class VerifyEmailView(APIView):
    """POST /api/auth/verify-email/  { code } (autenticado)

    Valida el código recibido por correo y marca el email como verificado.
    Devuelve JWT frescos: recién acá el usuario puede acceder a la app.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = (request.data.get("code") or "").strip()
        if not code:
            return Response(
                {"detail": "Indicá el código de verificación."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        if user.is_email_verified:
            return Response(
                {"detail": "Tu email ya está verificado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not user.email:
            return Response(
                {"detail": "Primero indicá tu email para verificarlo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = verify_email_code(user, code)
        except VerificationError as exc:
            return Response(
                {"detail": str(exc), "code": exc.code},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = {"user": UserSerializer(user).data, **_tokens_for(user)}
        return Response(data)


class ResendVerificationView(APIView):
    """POST /api/auth/verify-email/resend/ (autenticado) → nuevo código."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.is_email_verified:
            return Response(
                {"detail": "Tu email ya está verificado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not user.email:
            return Response(
                {"detail": "Primero indicá tu email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            send_verification_email(user)
        except VerificationError as exc:
            return Response(
                {"detail": str(exc), "code": exc.code},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        data = {
            "detail": "Enviamos un código nuevo a tu email.",
            "email": user.email,
            "dev_code": user.email_verification.code if using_console_backend() else None,
        }
        return Response(data)


class LoginView(APIView):
    """Login con email o username. Devuelve el usuario y los JWT (refresh/access).

    Las cuentas sin email verificado entran igual y la app las lleva a
    /verify-email: los datos siguen protegidos por IsVerifiedUser.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get("email") or request.data.get("username")
        password = request.data.get("password")

        if not identifier or not password:
            return Response(
                {"detail": "Indicá email y contraseña."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = _authenticate_by_username_or_email(identifier, password)
        if user is None:
            return Response(
                {"detail": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = {"user": UserSerializer(user).data, **_tokens_for(user)}
        return Response(data)


class GoogleLoginView(APIView):
    """Verifica el ID token de "Sign in with Google" y crea/inicia sesión."""

    permission_classes = [AllowAny]

    def post(self, request):
        credential = request.data.get("credential")
        if not credential:
            return Response(
                {"detail": "Falta el token de Google."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not settings.GOOGLE_CLIENT_ID:
            return Response(
                {"detail": "El login con Google no está configurado."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            info = id_token.verify_oauth2_token(
                credential,
                GoogleRequest(),
                settings.GOOGLE_CLIENT_ID,
            )
        except Exception as exc:  # token inválido, audiencia o red de Google
            logger.warning("Google token inválido: %s", exc)
            return Response(
                {"detail": "Token de Google inválido."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        email = info.get("email")
        if not email:
            return Response(
                {"detail": "El token de Google no incluye un email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        base_username = email.split("@", 1)[0]
        name = info.get("name") or base_username

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": _unique_username(base_username),
                "display_name": name[:50],
                "is_email_verified": True,
            },
        )
        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])
            create_initial_progression(user)
        else:
            changed = []
            if name and not user.display_name:
                user.display_name = name[:50]
                changed.append("display_name")
            if not user.is_email_verified:
                # Google ya validó el email: también vale para una cuenta que
                # se haya registrado antes con email/contraseña.
                user.is_email_verified = True
                changed.append("is_email_verified")
                # Si quedó una verificación pendiente del registro, ya no hace falta.
                EmailVerification.objects.filter(user=user).delete()
            if changed:
                user.save(update_fields=changed)

        data = {"user": UserSerializer(user).data, **_tokens_for(user)}
        return Response(data)
