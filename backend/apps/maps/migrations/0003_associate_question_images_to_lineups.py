"""Asocia a cada lineup las imágenes que ya tenían sus preguntas.

Por cada pregunta con lineup e imagen cargada se crea un LineupImage (si la
url todavía no está en el lineup), así la galería arranca con el contenido
actual y nada se rompe: la pregunta sigue apuntando a su image_url.
"""

from django.db import migrations


def associate_question_images_to_lineups(apps, schema_editor):
    Question = apps.get_model("quiz", "Question")
    LineupImage = apps.get_model("maps", "LineupImage")
    seen = set()
    rows = []
    for question in (
        Question.objects.exclude(lineup__isnull=True)
        .exclude(image_url="")
        .order_by("lineup_id")
    ):
        key = (question.lineup_id, question.image_url)
        if key in seen:
            continue
        seen.add(key)
        rows.append(
            LineupImage(
                lineup_id=question.lineup_id,
                image_url=question.image_url,
                order=len(rows),
            )
        )
    if rows:
        LineupImage.objects.bulk_create(rows)


class Migration(migrations.Migration):
    dependencies = [
        ("maps", "0002_lineupimage"),
    ]

    operations = [
        migrations.RunPython(
            associate_question_images_to_lineups, migrations.RunPython.noop
        ),
    ]