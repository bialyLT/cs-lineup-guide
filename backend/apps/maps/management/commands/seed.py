"""Siembra de contenido de ejemplo para desarrollo.

Uso: python manage.py seed

Recrea mapas, lugares, lineups y preguntas. Borra el contenido existente para
ser idempotente (los desbloqueos de usuarios se pierden en desarrollo).
"""
from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.maps.models import Lineup, Map, Place, UtilityType
from apps.quiz.models import Option, Question, QuestionType

Point = tuple[Decimal, Decimal]


class Command(BaseCommand):
    help = "Siembra contenido de mapas, lineups y preguntas."

    def handle(self, *args, **options):  # noqa: ANN002, ANN003
        Map.objects.all().delete()

        mirage = self.map_("Mirage", "mirage", 1, is_free=True)
        inferno = self.map_("Inferno", "inferno", 2, requires_pro_plan=True)
        dust2 = self.map_("Dust II", "dust2", 3)
        nuke = self.map_("Nuke", "nuke", 4, requires_pro_plan=True)
        ancient = self.map_("Ancient", "ancient", 5, requires_pro_plan=True)
        anubis = self.map_("Anubis", "anubis", 6, requires_pro_plan=True)

        # ----- Mirage (gratis) -----
        a_site = self.place(mirage, "A site", 1, 58, 30)
        aptos = self.place(mirage, "Apartamento", 2, 30, 62)
        conector = self.place(mirage, "Conector", 3, 62, 58)

        smoke_a = self.lineup(a_site, "Smoke default de A", UtilityType.SMOKE, 1)
        self.point_question(
            smoke_a,
            QuestionType.REFERENCE,
            "¿Dónde apuntás el smoke default de A site?",
            "Tocá el punto exacto sobre el mapa.",
            [(34, 28), (58, 44), (42, 66), (18, 72)],
            correct=0,
        )
        self.text_question(
            smoke_a,
            QuestionType.KEY_COMBO,
            "¿Qué tenés que apuntar para que el smoke caiga en el sitio?",
            "Es el lineup clásico desde la ventana de apartamentos.",
            [
                "Esquina superior de la caja A",
                "Centro de la caja A",
                "Borde de la azotea",
                "Marqués de la ventana",
            ],
            correct=0,
        )

        molotov_a = self.lineup(a_site, "Molotov desde palacio", UtilityType.MOLOTOV, 2)
        self.text_question(
            molotov_a,
            QuestionType.UTILITY,
            "¿Qué utilidad lanzás para despejar A site desde palacio?",
            "El ángulo restringe mucho el campo de visión del defensor.",
            ["Molotov", "Flashbang", "Smoke", "Incendiaria"],
            correct=0,
        )
        self.point_question(
            molotov_a,
            QuestionType.LANDING_SPOT,
            "¿Dónde cae la molotov si tirás desde palacio?",
            "Ubicá el punto de caída.",
            [(30, 20), (62, 38), (40, 74), (76, 60)],
            correct=2,
        )

        smoke_aptos = self.lineup(aptos, "Smoke de apartamento", UtilityType.SMOKE, 1)
        self.point_question(
            smoke_aptos,
            QuestionType.REFERENCE,
            "¿Dónde apuntás el smoke para tapar apartamento?",
            "Tocá el punto exacto sobre el mapa.",
            [(50, 12), (24, 32), (70, 52), (44, 84)],
            correct=1,
        )
        self.text_question(
            smoke_aptos,
            QuestionType.MAP_LOCATION,
            "¿Cómo se llama esta zona del mapa?",
            "La ventana de este apartamento domina el sitio.",
            ["Apartamento", "Café", "Conector", "Palacio"],
            correct=0,
        )

        flash_aptos = self.lineup(aptos, "Flash de apartamento", UtilityType.FLASHBANG, 2)
        self.point_question(
            flash_aptos,
            QuestionType.PLAYER_POSITION,
            "¿Desde qué posición jugás esta flash?",
            "El ángulo más usado para entrar a A site.",
            [(50, 12), (24, 32), (70, 52), (44, 84)],
            correct=2,
        )

        smoke_conector = self.lineup(conector, "Smoke de conector", UtilityType.SMOKE, 1)
        self.point_question(
            smoke_conector,
            QuestionType.REFERENCE,
            "¿Dónde apuntás el smoke de conector?",
            "Ubicá la referencia.",
            [(28, 18), (52, 34), (66, 70), (20, 78)],
            correct=1,
        )
        self.point_question(
            smoke_conector,
            QuestionType.LANDING_SPOT,
            "¿Dónde cae el smoke de conector?",
            "Ubicá el punto de caída.",
            [(40, 26), (64, 46), (32, 62), (78, 34)],
            correct=0,
        )

        # ----- Mapas bloqueados -----
        self.locked_map_content(inferno, "Bananas", "Smoke de bananas")
        self.locked_map_content(dust2, "Puerta larga", "Smoke de puerta larga")
        self.locked_map_content(nuke, "Exterior", "Smoke de exterior")
        self.locked_map_content(ancient, "Zona", "Smoke de zona")
        self.locked_map_content(anubis, "Agua", "Smoke de agua")

        self.stdout.write(self.style.SUCCESS("Contenido sembrado correctamente."))

    # ----- Helpers -----

    def map_(
        self,
        name: str,
        slug: str,
        order: int,
        is_free: bool = False,
        requires_pro_plan: bool = False,
    ) -> Map:
        return Map.objects.create(
            name=name,
            slug=slug,
            order=order,
            is_free=is_free,
            requires_pro_plan=requires_pro_plan,
        )

    def place(self, map_: Map, name: str, order: int, x: int, y: int) -> Place:
        return Place.objects.create(
            map=map_,
            name=name,
            order=order,
            position_x=Decimal(x),
            position_y=Decimal(y),
        )

    def lineup(self, place: Place, title: str, util: UtilityType, order: int) -> Lineup:
        return Lineup.objects.create(place=place, title=title, util=util, order=order)

    def point_question(
        self,
        lineup: Lineup,
        qtype: QuestionType,
        prompt: str,
        helper: str,
        points: list[Point],
        correct: int,
    ) -> Question:
        question = Question.objects.create(
            map=lineup.place.map,
            lineup=lineup,
            type=qtype,
            prompt=prompt,
            helper_text=helper,
        )
        for index, (x, y) in enumerate(points):
            Option.objects.create(
                question=question,
                position_x=Decimal(x),
                position_y=Decimal(y),
                is_correct=index == correct,
                order=index,
            )
        return question

    def text_question(
        self,
        lineup: Lineup,
        qtype: QuestionType,
        prompt: str,
        helper: str,
        texts: list[str],
        correct: int,
    ) -> Question:
        question = Question.objects.create(
            map=lineup.place.map,
            lineup=lineup,
            type=qtype,
            prompt=prompt,
            helper_text=helper,
        )
        for index, text in enumerate(texts):
            Option.objects.create(
                question=question,
                text=text,
                is_correct=index == correct,
                order=index,
            )
        return question

    def locked_map_content(self, map_: Map, place_name: str, lineup_title: str) -> None:
        place = self.place(map_, place_name, 1, 50, 50)
        lineup_ = self.lineup(place, lineup_title, UtilityType.SMOKE, 1)
        self.point_question(
            lineup_,
            QuestionType.REFERENCE,
            f"¿Dónde apuntás {lineup_title.lower()}?",
            "Ubicá la referencia del lineup.",
            [(30, 25), (55, 45), (40, 70), (75, 60)],
            correct=0,
        )