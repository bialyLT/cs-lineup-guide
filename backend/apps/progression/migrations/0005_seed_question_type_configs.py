"""Seed de la configuración inicial de tipos de pregunta.

reference y map_location se desbloquean desde el inicio (nivel 0);
utility exige el nivel 6 (todas las utilidades) con niveles por utilidad
2-6; el resto solo se desbloquea con monedas (unlock_level vacío).
"""

from django.db import migrations

from apps.quiz.models import QuestionType


def seed_question_type_configs(apps, schema_editor):
    QuestionTypeConfig = apps.get_model("progression", "QuestionTypeConfig")
    QuestionTypeConfig.objects.bulk_create(
        [
            QuestionTypeConfig(
                question_type=QuestionType.REFERENCE.value,
                label=QuestionType.REFERENCE.label,
                unlock_level=0,
                order=1,
            ),
            QuestionTypeConfig(
                question_type=QuestionType.MAP_LOCATION.value,
                label=QuestionType.MAP_LOCATION.label,
                unlock_level=0,
                order=2,
            ),
            QuestionTypeConfig(
                question_type=QuestionType.UTILITY.value,
                label=QuestionType.UTILITY.label,
                unlock_level=6,
                order=3,
                utility_levels=(
                    '{"smoke": 2, "molotov": 3, "flashbang": 4, "he": 5, "decoy": 6}'
                ),
            ),
            QuestionTypeConfig(
                question_type=QuestionType.LANDING_SPOT.value,
                label=QuestionType.LANDING_SPOT.label,
                unlock_level=None,
                order=4,
            ),
            QuestionTypeConfig(
                question_type=QuestionType.KEY_COMBO.value,
                label=QuestionType.KEY_COMBO.label,
                unlock_level=None,
                order=5,
            ),
            QuestionTypeConfig(
                question_type=QuestionType.PLAYER_POSITION.value,
                label=QuestionType.PLAYER_POSITION.label,
                unlock_level=None,
                order=6,
            ),
        ]
    )


class Migration(migrations.Migration):
    dependencies = [
        ("progression", "0004_questiontypeconfig"),
    ]

    operations = [
        migrations.RunPython(seed_question_type_configs, migrations.RunPython.noop),
    ]