from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.progression.services import (
    get_or_create_progression,
    get_unlocked_map_slugs,
    record_answer,
)
from apps.maps.models import Map

from .models import Option, Question
from .serializers import QuizSerializer
from .services import (
    QuizGenerationError,
    available_question_count,
    generate_quiz,
)


def accessible_maps(user, map_slugs):
    """Mapas pedidos que el usuario puede usar (gratis o desbloqueados)."""
    owned_slugs = get_unlocked_map_slugs(user)
    maps = Map.objects.filter(slug__in=set(map_slugs))
    accessible = [m for m in maps if m.is_free or m.slug in owned_slugs]
    return Map.objects.filter(pk__in=[m.pk for m in accessible])


class GenerateQuizView(APIView):
    """POST /api/quizzes/generate/  { map_ids: [slug, ...], title?: str }

    Opcional: `place_ids` (acota a lugares, máximo el desbloqueado),
    `lineup_ids` (acota a lineups desbloqueados), `question_type` (filtra por
    tipo) y `count` (cantidad de preguntas).
    """

    class InputSerializer(serializers.Serializer):
        map_ids = serializers.ListField(child=serializers.CharField())
        title = serializers.CharField(required=False, allow_blank=True)
        place_ids = serializers.ListField(
            child=serializers.IntegerField(), required=False, allow_empty=True
        )
        lineup_ids = serializers.ListField(
            child=serializers.IntegerField(), required=False, allow_empty=True
        )
        question_type = serializers.CharField(required=False, allow_blank=True)
        count = serializers.IntegerField(required=False, min_value=1)

    def post(self, request):
        input_ = self.InputSerializer(data=request.data)
        input_.is_valid(raise_exception=True)
        data = input_.validated_data
        user = request.user

        maps = accessible_maps(user, data["map_ids"])
        if not maps.exists():
            return Response(
                {"detail": "Ningún mapa seleccionado está desbloqueado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            quiz = generate_quiz(
                user,
                maps,
                title=data.get("title", ""),
                place_ids=data.get("place_ids") or None,
                lineup_ids=data.get("lineup_ids") or None,
                question_type=data.get("question_type") or None,
                count=data.get("count"),
            )
        except QuizGenerationError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            QuizSerializer(quiz, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class QuizAvailabilityView(APIView):
    """GET /api/quizzes/available/?maps=<slug>&place_id=<id>&lineup_id=<id>&type=<type>

    Devuelve la cantidad de preguntas disponibles para la selección: es el
    máximo de preguntas que el usuario puede pedir en el quiz.
    """

    def get(self, request):
        maps = accessible_maps(request.user, request.query_params.getlist("maps"))
        place_ids = [
            int(value) for value in request.query_params.getlist("place_id") if value.isdigit()
        ]
        lineup_ids = [
            int(value) for value in request.query_params.getlist("lineup_id") if value.isdigit()
        ]
        question_type = request.query_params.get("type") or None
        count = available_question_count(
            request.user,
            maps,
            place_ids=place_ids or None,
            lineup_ids=lineup_ids or None,
            question_type=question_type,
        )
        return Response({"available": count})


class AnswerQuestionView(APIView):
    """POST /api/questions/<pk>/answer/  { option_id: int }"""

    def post(self, request, pk: int):
        try:
            question = Question.objects.get(pk=pk)
        except Question.DoesNotExist:
            return Response(
                {"detail": "Pregunta no encontrada."}, status=status.HTTP_404_NOT_FOUND
            )

        option_id = request.data.get("option_id")
        option = Option.objects.filter(pk=option_id, question=question).first()
        if not option:
            return Response(
                {"detail": "Opción inválida para esta pregunta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        progression = record_answer(request.user, correct=option.is_correct)
        return Response(
            {
                "correct": option.is_correct,
                "xp": progression.xp,
                "coins": progression.coins,
                "streak": progression.streak,
                "best_streak": progression.best_streak,
            }
        )