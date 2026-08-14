"""Mixins que registran en el trail de auditoría las mutaciones del panel."""

import logging

from .models import AdminAuditLog

logger = logging.getLogger(__name__)


def _client_ip(request) -> str | None:
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class AuditLogMixin:
    """Registra create/update/delete en AdminAuditLog.

    El registro nunca debe romper la operación: ante cualquier error solo se
    loguea y se continúa.
    """

    def _log(self, action: str, instance, payload: dict) -> None:
        try:
            AdminAuditLog.objects.create(
                actor=(
                    self.request.user
                    if self.request.user.is_authenticated
                    else None
                ),
                action=action,
                app_label=instance._meta.app_label,
                model_name=instance._meta.model_name,
                object_id=str(instance.pk),
                summary=str(instance)[:200],
                payload=payload or {},
                ip_address=_client_ip(self.request),
            )
        except Exception:  # pragma: no cover - nunca debe romper la mutación
            logger.exception("No se pudo registrar el audit log")

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log(AdminAuditLog.Action.CREATE, instance, serializer.data)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._log(AdminAuditLog.Action.UPDATE, instance, serializer.data)

    def perform_destroy(self, instance):
        self._log(AdminAuditLog.Action.DELETE, instance, {})
        instance.delete()
