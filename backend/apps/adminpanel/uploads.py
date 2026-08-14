"""Subida de imágenes al bucket de Cloudflare R2 (solo staff)."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from config.storage import (
    R2ConfigurationError,
    R2UploadError,
    delete_object,
    key_from_url,
    r2_enabled,
    upload_image,
)

from .permissions import IsStaffUser
from .throttles import AdminBurstThrottle

IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
    "image/svg+xml",
}

# Carpeta destino según el tipo de contenido.
KIND_FOLDERS = {
    "maps": "maps",
    "questions": "questions",
}


class AdminUploadView(APIView):
    """POST /api/admin/uploads/  (multipart) { file, kind?: maps|questions }
    DELETE /api/admin/uploads/?url=<url>

    POST sube una imagen al bucket cslineupsguide y devuelve la URL pública.
    DELETE elimina un objeto del bucket (best-effort): si la URL no pertenece
    al bucket configurado responde deleted=False sin tocar nada.
    """

    permission_classes = [IsStaffUser]
    throttle_classes = [AdminBurstThrottle]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"detail": "Falta el archivo (campo 'file')."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file.content_type not in IMAGE_CONTENT_TYPES:
            return Response(
                {
                    "detail": (
                        "Solo se permiten imágenes "
                        "(JPG, PNG, WebP, GIF, AVIF o SVG)."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not r2_enabled():
            return Response(
                {"detail": "El almacenamiento de imágenes no está configurado."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        kind = request.data.get("kind", "maps")
        folder = KIND_FOLDERS.get(kind, "images")

        try:
            url = upload_image(file, folder)
        except R2ConfigurationError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except R2UploadError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {"url": url, "kind": kind},
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request):
        url = request.query_params.get("url") or ""
        key = key_from_url(url)
        if not key:
            return Response({"deleted": False})
        delete_object(key)
        return Response({"deleted": True})