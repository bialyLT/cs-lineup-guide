from django.db import models


class UtilityType(models.TextChoices):
    SMOKE = "smoke", "Smoke"
    FLASHBANG = "flashbang", "Flashbang"
    HE = "he", "HE"
    MOLOTOV = "molotov", "Molotov"
    DECOY = "decoy", "Decoy"


class Map(models.Model):
    name = models.CharField("nombre", max_length=50)
    slug = models.SlugField("slug", max_length=50, unique=True)
    image_url = models.URLField("imagen", blank=True)
    is_free = models.BooleanField("gratis", default=False)
    requires_pro_plan = models.BooleanField(
        "requiere plan Pro",
        default=False,
        help_text="Si es True, solo los usuarios con plan Pro pueden comprarlo.",
    )
    order = models.PositiveSmallIntegerField("orden", default=0)

    class Meta:
        ordering = ["order", "name"]
        verbose_name = "mapa"
        verbose_name_plural = "mapas"

    def __str__(self) -> str:
        return self.name


class Place(models.Model):
    """Un lugar del mapa (A site, Apartamento...). Es contenido desbloqueable."""

    map = models.ForeignKey(Map, on_delete=models.CASCADE, related_name="places")
    name = models.CharField("nombre", max_length=50)
    order = models.PositiveSmallIntegerField("orden", default=0)
    # Coordenadas relativas (0-100) del lugar sobre el overview del mapa.
    position_x = models.DecimalField(
        "posición X", max_digits=5, decimal_places=2, null=True, blank=True
    )
    position_y = models.DecimalField(
        "posición Y", max_digits=5, decimal_places=2, null=True, blank=True
    )
    # Radio de tolerancia (0-100) para preguntas de zona (map_area): un toque
    # dentro de este radio del marcador cuenta como acierto. Si es nulo se usa
    # el radio por defecto de QuizConfig.
    hit_radius = models.DecimalField(
        "radio de zona", max_digits=5, decimal_places=2, null=True, blank=True
    )

    class Meta:
        ordering = ["order", "name"]
        constraints = [
            models.UniqueConstraint(fields=["map", "name"], name="unique_place_per_map")
        ]
        verbose_name = "lugar"
        verbose_name_plural = "lugares"

    def __str__(self) -> str:
        return f"{self.name} ({self.map.name})"


class Lineup(models.Model):
    """Un lineup concreto dentro de un lugar, con su utilidad."""

    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name="lineups")
    title = models.CharField("título", max_length=100)
    util = models.CharField(
        "utilidad", max_length=20, choices=UtilityType.choices
    )
    description = models.TextField("descripción", blank=True)
    order = models.PositiveSmallIntegerField("orden", default=0)

    class Meta:
        ordering = ["order", "title"]
        verbose_name = "lineup"
        verbose_name_plural = "lineups"

    def __str__(self) -> str:
        return self.title


class LineupImage(models.Model):
    """Imagen de un lineup. Cada lineup puede tener varias: se reusan entre
    preguntas del mismo lineup (el enunciado cambia, la imagen no)."""

    lineup = models.ForeignKey(
        Lineup, on_delete=models.CASCADE, related_name="images"
    )
    image_url = models.URLField("imagen")
    order = models.PositiveSmallIntegerField("orden", default=0)
    created_at = models.DateTimeField("creado", auto_now_add=True)

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["lineup", "image_url"], name="unique_lineup_image_url"
            )
        ]
        verbose_name = "imagen de lineup"
        verbose_name_plural = "imágenes de lineup"

    def __str__(self) -> str:
        return f"{self.lineup.title} · {self.image_url}"