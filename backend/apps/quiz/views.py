from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.progression.services import get_or_create_progression, record_answer
from apps.maps.models import Map

from .models import Option, Question
from .serializers import QuizSerializer
from .services import QuizGenerationError, generate_quiz


class GenerateQuizView(APIView):
    """POST /api/quizzes/generate/  { map_ids: [slug, ...], title?: str }"""

    class InputSerializer(serializers.Serializer):
        map_ids = serializers.ListField(child=serializers.CharField())
        title = serializers.CharField(required=False, allow_blank=True)

    def post(self, request):
        input_ = self.InputSerializer(data=request.data)
        input_.is_valid(raise_exception=True)

        map_slugs = set(input_.validated_data["map_ids"])
        user = request.user

        from apps.progression.services import get_unlocked_map_slugs

        owned_slugs = get_unlocked_map_slugs(user)
        maps = Map.objects.filter(slug__in=map_slugs)
        accessible = {m.slug for m in maps if m.is_free or m.slug in owned_slugs}

        if not accessible:
            return Response(
                {"detail": "Ningún mapa seleccionado está desbloqueado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            quiz = generate_quiz(user, maps.filter(slug__in=accessible).distinct())
        except QuizGenerationError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            QuizSerializer(quiz, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


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