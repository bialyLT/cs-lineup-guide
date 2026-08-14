"""Throttling del panel de administración: límites por usuario autenticado."""

from rest_framework.throttling import UserRateThrottle


class AdminBurstThrottle(UserRateThrottle):
    """Frena ráfagas de peticiones de un mismo usuario (brute force)."""

    rate = "120/min"
    scope = "admin"
