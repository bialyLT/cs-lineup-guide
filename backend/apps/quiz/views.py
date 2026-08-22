from django.db import transaction
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.throttles import UserScopedRateThrottle
from apps.progression.services import (
    get_or_create_progression,
    get_unlocked_map_slugs,
    record_answer,
    record_quiz_completion,
)
from apps.maps.models import Map

from .models import (
    Option,
    Question,
    QuestionReport,
    QuestionType,
    Quiz,
    QuizAnswer,
    QuizConfig,
    QuizQuestion,
)
from .serializers import QuizSerializer
from .services import (
    QuizGenerationError,
    available_question_count,
    generate_quiz,
    get_quiz_config,
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
        difficulty = serializers.ChoiceField(
            choices=Quiz.DIFFICULTY_CHOICES,
            required=False,
            default=Quiz.DIFFICULTY_EASY,
        )

    throttle_classes = [UserScopedRateThrottle]
    throttle_scope = "quiz_generate"

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
                difficulty=data.get("difficulty", Quiz.DIFFICULTY_EASY),
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
    """POST /api/quizzes/<quiz_id>/questions/<pk>/answer/  { option_id: int }

    Solo se puede responder una pregunta de un quiz generado por el propio
    usuario (el quiz se genera únicamente con contenido desbloqueado), y cada
    pregunta otorga XP/monedas UNA sola vez por quiz: los reintentos devuelven
    la corrección (`awarded: false`) pero no vuelven a premiar.
    """

    throttle_classes = [UserScopedRateThrottle]
    throttle_scope = "answer"

    @transaction.atomic
    def post(self, request, quiz_id: int, pk: int):
        quiz = Quiz.objects.filter(pk=quiz_id, user=request.user).first()
        if not quiz:
            return Response(
                {"detail": "Quiz no encontrado."}, status=status.HTTP_404_NOT_FOUND
            )

        # Bloqueo de fila: dos respuestas concurrentes a la misma pregunta no
        # pueden cruzar el chequeo de idempotencia y premiar dos veces.
        quiz_question = (
            QuizQuestion.objects.select_for_update()
            .select_related("question")
            .filter(quiz=quiz, question_id=pk)
            .first()
        )
        if not quiz_question:
            return Response(
                {"detail": "La pregunta no pertenece a este quiz."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        question = quiz_question.question
        is_area = question.type in (QuestionType.MAP_AREA, QuestionType.MAP_LOCATION)

        # Para preguntas de zona (map_area) la respuesta es una coordenada de
        # toque; para el resto, una opción. Timeout => sin opción ni coordenada.
        option = None
        area_correct = False
        tap = None  # (x, y) en 0-100 si el usuario tocó el mapa

        if is_area:
            pos_x = request.data.get("position_x")
            pos_y = request.data.get("position_y")
            place = question.place
            if (
                pos_x is not None
                and pos_y is not None
                and place
                and place.position_x is not None
                and place.position_y is not None
            ):
                try:
                    tap_x = float(pos_x)
                    tap_y = float(pos_y)
                except (TypeError, ValueError):
                    tap_x = tap_y = None
                if tap_x is not None:
                    radius = float(
                        place.hit_radius
                        if place.hit_radius is not None
                        else get_quiz_config().default_hit_radius
                    )
                    dx = tap_x - float(place.position_x)
                    dy = tap_y - float(place.position_y)
                    area_correct = (dx * dx + dy * dy) ** 0.5 <= radius
                    tap = (tap_x, tap_y)
        else:
            option_id = request.data.get("option_id")
            if option_id is not None:
                option = Option.objects.filter(
                    pk=option_id, question=question
                ).first()
                if not option:
                    return Response(
                        {"detail": "Opción inválida para esta pregunta."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        already_answered = QuizAnswer.objects.filter(
            quiz_question=quiz_question
        ).exists()

        progression = get_or_create_progression(request.user)
        if not already_answered:
            is_correct = area_correct if is_area else (option.is_correct if option else False)
            progression = record_answer(
                request.user, correct=is_correct, progression=progression
            )
            QuizAnswer.objects.create(
                quiz_question=quiz_question,
                option=option,
                tap_x=tap[0] if tap else None,
                tap_y=tap[1] if tap else None,
                is_correct=is_correct,
            )

            # ¿Quiz completo? (todas sus preguntas ya respondidas). La racha
            # solo se actualiza aquí, según si el quiz fue 100% correcto.
            total = quiz.quiz_questions.count()
            answered = QuizAnswer.objects.filter(quiz_question__quiz=quiz).count()
            if total > 0 and answered >= total:
                all_correct = not QuizAnswer.objects.filter(
                    quiz_question__quiz=quiz, is_correct=False
                ).exists()
                progression = record_quiz_completion(
                    request.user, all_correct=all_correct, progression=progression
                )

        # Corrección a devolver: la guardada si ya respondió, la nueva si no.
        if already_answered:
            stored = QuizAnswer.objects.filter(quiz_question=quiz_question).first()
            is_correct = bool(stored.is_correct) if stored else False
        else:
            is_correct = area_correct if is_area else (option.is_correct if option else False)

        correct_option = Option.objects.filter(
            question=question, is_correct=True
        ).first()

        # Zona correcta para preguntas de tipo área (dibujar el feedback).
        target = None
        if is_area and question.place and question.place.position_x is not None:
            place = question.place
            radius = float(
                place.hit_radius
                if place.hit_radius is not None
                else get_quiz_config().default_hit_radius
            )
            target = {
                "x": float(place.position_x),
                "y": float(place.position_y),
                "radius": radius,
            }

        return Response(
            {
                "correct": is_correct,
                "awarded": not already_answered,
                "correct_option_id": correct_option.id if correct_option else None,
                "target": target,
                "xp": progression.xp,
                "coins": progression.coins,
                "streak": progression.streak,
                "best_streak": progression.best_streak,
            }
        )


class QuizConfigView(APIView):
    """GET /api/quiz-config/  Devuelve la configuración global del quiz.

    Hoy expone el tiempo por pregunta en dificultad difícil (editable en el
    panel de administración).
    """

    def get(self, request):
        from .services import get_quiz_config

        config = get_quiz_config()
        return Response(
            {"hard_seconds_per_question": config.hard_seconds_per_question}
        )


class ReportQuestionView(APIView):
    """POST /api/questions/<pk>/report/  { reason, detail? }

    Reporte anónimo de una pregunta. No se guarda quién lo hizo ni ningún dato
    de la cuenta: solo la pregunta, el motivo y (si aplica) el detalle.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        question = Question.objects.filter(pk=pk).first()
        if not question:
            return Response(
                {"detail": "Pregunta no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        reason = request.data.get("reason")
        detail = (request.data.get("detail") or "").strip()
        valid_reasons = {choice[0] for choice in QuestionReport.REASON_CHOICES}
        if reason not in valid_reasons:
            return Response(
                {"detail": "Motivo inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if reason == QuestionReport.REASON_OTRO and not detail:
            return Response(
                {"detail": "Detallá el motivo para el reporte."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        QuestionReport.objects.create(
            question=question, reason=reason, detail=detail
        )
        return Response({"ok": True}, status=status.HTTP_201_CREATED)