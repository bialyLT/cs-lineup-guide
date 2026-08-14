"""Permisos para el panel de administración.

La regla central de seguridad: todo acceso al panel exige un usuario
autenticado (JWT) y con permisos de staff/superusuario. Esta validación
se aplica en el servidor en cada viewset; el frontend solo oculta la
entrada al panel, nunca es la frontera de seguridad.
"""

from rest_framework.permissions import BasePermission


class IsStaffUser(BasePermission):
    """Solo personal autorizado (is_staff o is_superuser) autenticado."""

    message = "No tenés permisos de administrador."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_staff or user.is_superuser)
        )
