"""Enunciados por tipo de pregunta.

Cada tipo de pregunta tiene un enunciado fijo. El de "Lugares del mapa"
(``map_location``) interpola el nombre del lugar con ``{place}``. Esto
centraliza el texto que ve el usuario sin depender del campo ``prompt``
guardado en cada pregunta.
"""

QUESTION_TYPE_PROMPTS = {
    "reference": "¿Cuál es la referencia exacta de este lineup?",
    "map_location": "Marcá en el mapa dónde está {place}.",
    "map_area": "¿Dónde está {place}? Tocá la zona del mapa.",
    "key_combo": "¿Cuál es la combinación de teclas para lanzar este lineup?",
    "utility": "¿Qué utilidad se lanza en este lineup?",
    "landing_spot": "¿Hacia dónde se lanza esta utilidad?",
    "player_position": (
        "¿En qué posición el jugador tiene que ubicarse para lanzar esta utilidad?"
    ),
}

MAP_AREA_HELPER = "Tocá sobre el mapa la zona donde está el lugar."


def question_prompt(question) -> str:
    """Enunciado a mostrar para la pregunta, según su tipo.

    Para ``map_location`` usa el nombre del lugar (del lugar propio de la
    pregunta o del lugar del lineup). Si no hay plantilla para el tipo, se
    devuelve el enunciado guardado en la pregunta.
    """
    template = QUESTION_TYPE_PROMPTS.get(question.type)
    if not template:
        return question.prompt

    place_name = ""
    if getattr(question, "place_id", None):
        place = getattr(question, "place", None)
        place_name = place.name if place else ""
    elif getattr(question, "lineup_id", None):
        lineup = getattr(question, "lineup", None)
        place_name = lineup.place.name if (lineup and lineup.place) else ""

    try:
        return template.format(place=place_name)
    except (KeyError, IndexError):
        return template
