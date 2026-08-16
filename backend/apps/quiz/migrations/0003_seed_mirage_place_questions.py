"""Seed de preguntas de lugar (map_location) para Mirage.

Son el contenido inicial de todos los usuarios: el primer quiz pide marcar
dónde están los lugares elegidos sobre el overview del mapa. Se crean solo si
Mirage tiene lugares con posición y el mapa tiene imagen.
"""

from django.db import migrations

SEED_PROMPT_PREFIX = "Marcá en el mapa dónde está"


def seed_mirage_place_questions(apps, schema_editor):
    Map = apps.get_model("maps", "Map")
    Question = apps.get_model("quiz", "Question")
    Option = apps.get_model("quiz", "Option")

    mirage = Map.objects.filter(slug="mirage").first()
    if not mirage or not mirage.image_url:
        return

    places = [
        place
        for place in mirage.places.order_by("order")
        if place.position_x is not None and place.position_y is not None
    ]
    if len(places) < 2:
        return

    for place in places:
        if Question.objects.filter(
            map=mirage, type="map_location", place_id=place.id
        ).exists():
            continue
        question = Question.objects.create(
            map=mirage,
            place_id=place.id,
            type="map_location",
            prompt=f"{SEED_PROMPT_PREFIX} {place.name}.",
            helper_text="Elegí en el mapa el lugar que se indica.",
            image_url=mirage.image_url,
        )
        for index, candidate in enumerate(places, start=1):
            Option.objects.create(
                question=question,
                text="",
                position_x=candidate.position_x,
                position_y=candidate.position_y,
                is_correct=(candidate.id == place.id),
                order=index,
            )


def unseed_mirage_place_questions(apps, schema_editor):
    Map = apps.get_model("maps", "Map")
    Question = apps.get_model("quiz", "Question")

    mirage = Map.objects.filter(slug="mirage").first()
    if not mirage:
        return
    Question.objects.filter(
        map=mirage,
        type="map_location",
        prompt__startswith=SEED_PROMPT_PREFIX,
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("quiz", "0002_question_place_alter_question_lineup"),
        ("maps", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            seed_mirage_place_questions,
            reverse_code=unseed_mirage_place_questions,
        ),
    ]
