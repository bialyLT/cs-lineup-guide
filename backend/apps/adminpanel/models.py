"""Trail de auditoría de las operaciones del panel de administración.

Cada create/update/delete registra actor, acción, modelo, objeto y IP para
poder auditar quién modificó qué y cuándo.
"""

from django.conf import settings
from django.db import models


class AdminAuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = "create", "Crear"
        UPDATE = "update", "Actualizar"
        DELETE = "delete", "Eliminar"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admin_audit_logs",
    )
    action = models.CharField("acción", max_length=10, choices=Action.choices)
    app_label = models.CharField("app", max_length=50)
    model_name = models.CharField("modelo", max_length=50)
    object_id = models.CharField("objeto", max_length=50)
    summary = models.CharField("resumen", max_length=255, blank=True)
    payload = models.JSONField("datos", default=dict, blank=True)
    ip_address = models.GenericIPAddressField("IP", null=True, blank=True)
    created_at = models.DateTimeField("fecha", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "registro de auditoría"
        verbose_name_plural = "registros de auditoría"

    def __str__(self) -> str:
        return (
            f"{self.get_action_display()} {self.model_name}#{self.object_id}"
            f" por {self.actor_id or 'desconocido'}"
        )
