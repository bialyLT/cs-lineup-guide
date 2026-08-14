"""Cliente de Cloudflare R2 (S3-compatible) para imágenes.

La API del frontend conserva `image_url` como URL completa: este módulo sube
archivos al bucket y devuelve la URL pública. Si faltan credenciales o la
URL pública, los uploads se rechazan con un error claro.
"""

import logging
import mimetypes
import uuid

from botocore.exceptions import ClientError
from django.conf import settings

logger = logging.getLogger(__name__)


class R2ConfigurationError(Exception):
    """Falta configuración (credenciales o URL pública) para usar R2."""


class R2UploadError(Exception):
    """No se pudo guardar el archivo en el bucket."""


def r2_enabled() -> bool:
    return bool(
        settings.R2_ACCESS_KEY_ID
        and settings.R2_SECRET_ACCESS_KEY
        and settings.R2_ENDPOINT_URL
        and settings.R2_PUBLIC_URL
    )


def _client():
    import boto3

    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT_URL,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )


def _object_key(folder: str, filename: str) -> str:
    ext = mimetypes.guess_extension(mimetypes.guess_type(filename)[0] or "")
    ext = ext or ".jpg"
    suffix = uuid.uuid4().hex
    name = f"{folder}/{suffix}{ext}".lstrip("/")
    return name


def upload_image(file, folder: str) -> str:
    """Sube un archivo de imagen a R2 y devuelve la URL pública completa."""
    if not r2_enabled():
        raise R2ConfigurationError(
            "El almacenamiento de imágenes no está configurado (credenciales R2)."
        )

    if file.size and file.size > settings.R2_MAX_UPLOAD_BYTES:
        raise R2UploadError("La imagen supera el tamaño máximo permitido.")

    key = _object_key(folder, getattr(file, "name", "") or "imagen.jpg")
    content_type = mimetypes.guess_type(getattr(file, "name", "") or "")[0] or "application/octet-stream"

    try:
        _client().put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=key,
            Body=file.read(),
            ContentType=content_type,
        )
    except ClientError as exc:
        logger.exception("Fallo al subir imagen a R2")
        raise R2UploadError(f"No se pudo subir la imagen: {exc}")

    return f"{settings.R2_PUBLIC_URL}/{key}"


def delete_object(key: str) -> None:
    """Elimina un objeto del bucket (best-effort, no rompe la operación)."""
    if not r2_enabled():
        return
    try:
        _client().delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
    except ClientError:
        logger.warning("No se pudo eliminar %s de R2", key)


def key_from_url(url: str) -> str | None:
    """Extrae la key del objeto a partir de su URL pública."""
    if not url or not settings.R2_PUBLIC_URL:
        return None
    prefix = f"{settings.R2_PUBLIC_URL}/"
    return url[len(prefix):] if url.startswith(prefix) else None