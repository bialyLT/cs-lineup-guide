from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AddEmailView,
    GoogleLoginView,
    LoginView,
    RegisterView,
    ResendVerificationView,
    VerifyEmailView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("google/", GoogleLoginView.as_view(), name="google_login"),
    path("me/email/", AddEmailView.as_view(), name="add_email"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify_email"),
    path("verify-email/resend/", ResendVerificationView.as_view(), name="verify_email_resend"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]