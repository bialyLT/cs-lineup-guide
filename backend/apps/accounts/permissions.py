from rest_framework.permissions import BasePermission


class IsVerifiedUser(BasePermission):
    """Permite solo usuarios autenticados con el email verificado.

    Es el permiso por defecto de la API: las cuentas registradas con
    email/contraseña recién acceden a los datos cuando verifican su correo.
    Los endpoints de auth (login/register/google/verificación) usan
    AllowAny/IsAuthenticated explícitamente.
    """

    message = "Verificá tu email para acceder."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "is_email_verified", False)
        )