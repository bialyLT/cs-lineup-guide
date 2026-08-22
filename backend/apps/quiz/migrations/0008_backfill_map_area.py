"""Backfill de preguntas de zona (map_area) para los mapas existentes.

Solo crea lo que falte (get_or_create dentro de sync), así es idempotente y
seguro de correr en cualquier entorno.
"""

from django.db import migrations


def backfill_map_area(apps, schema_editor):
    from apps.quiz.services import sync_map_area_questions
    from apps.maps.models import Map

    for map_ in Map.objects.all():
        sync_map_area_questions(map_)


class Migration(migrations.Migration):
    dependencies = [
        ("quiz", "0007_quizanswer_tap_x_quizanswer_tap_y_and_more"),
        ("maps", "0006_place_hit_radius"),
    ]

    operations = [
        migrations.RunPython(backfill_map_area, migrations.RunPython.noop),
    ]
