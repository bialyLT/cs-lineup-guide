"""Throttling de la API: límites por IP (anónimos) y por usuario (autenticados)."""

from rest_framework.throttling import ScopedRateThrottle


class UserScopedRateThrottle(ScopedRateThrottle):
    """Rate limit por scope, claveado por user id cuando hay sesión y por IP si no."""

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}