"""Registra el tipo de pregunta 'map_area' (zonas del mapa).

Se desbloquea desde el inicio (unlock_level=0), igual que 'map_location'.
Es idempotente: no duplica si ya existe.
"""

from django.db import migrations

from apps.quiz.models import QuestionType


def add_map_area_config(apps, schema_editor):
    QuestionTypeConfig = apps.get_model("progression", "QuestionTypeConfig")
    QuestionTypeConfig.objects.get_or_create(
        question_type=QuestionType.MAP_AREA.value,
        defaults={
            "label": QuestionType.MAP_AREA.label,
            "unlock_level": 0,
            "order": 7,
        },
    )


class Migration(migrations.Migration):
    dependencies = [
        ("progression", "0006_videorewardconfig_videorewardclaim"),
    ]

    operations = [
        migrations.RunPython(add_map_area_config, migrations.RunPython.noop),
    ]
