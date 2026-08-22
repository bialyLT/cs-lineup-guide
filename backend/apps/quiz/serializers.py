from rest_framework import serializers

from .models import Option, Question, QuestionType, Quiz, QuizConfig
from .prompts import question_prompt
from .services import get_quiz_config


class OptionSerializer(serializers.ModelSerializer):
    """No se expone is_correct: la corrección se resuelve en el servidor."""

    position = serializers.SerializerMethodField()

    class Meta:
        model = Option
        fields = ["id", "text", "position"]

    def get_position(self, obj: Option):
        if obj.position_x is None or obj.position_y is None:
            return None
        return {"x": float(obj.position_x), "y": float(obj.position_y)}


class QuestionSerializer(serializers.ModelSerializer):
    map = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    options = OptionSerializer(many=True, read_only=True)
    lineup_title = serializers.CharField(
        source="lineup.title", read_only=True, default=None
    )
    # El enunciado se deriva del tipo de pregunta (ver apps.quiz.prompts).
    prompt = serializers.SerializerMethodField()
    # Para preguntas de zona (map_area): la posición real del lugar y el radio
    # de tolerancia. El front dibuja la zona y evalúa el toque contra esto.
    target = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            "id",
            "map",
            "lineup_id",
            "place_id",
            "type",
            "prompt",
            "helper_text",
            "image_url",
            "lineup_title",
            "options",
            "target",
        ]

    def get_prompt(self, obj: Question) -> str:
        return question_prompt(obj)

    def get_target(self, obj: Question):
        if obj.type != QuestionType.MAP_AREA or not obj.place:
            return None
        place = obj.place
        if place.position_x is None or place.position_y is None:
            return None
        radius = (
            place.hit_radius
            if place.hit_radius is not None
            else get_quiz_config().default_hit_radius
        )
        return {
            "x": float(place.position_x),
            "y": float(place.position_y),
            "radius": float(radius),
        }


class QuizSerializer(serializers.ModelSerializer):
    map_ids = serializers.SlugRelatedField(
        source="maps", slug_field="slug", many=True, read_only=True
    )
    questions = serializers.SerializerMethodField()
    seconds_per_question = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "map_ids",
            "difficulty",
            "seconds_per_question",
            "questions",
        ]

    def get_seconds_per_question(self, obj: Quiz) -> int | None:
        if obj.difficulty != Quiz.DIFFICULTY_HARD:
            return None
        config = QuizConfig.objects.first()
        return config.hard_seconds_per_question if config else 20

    def get_questions(self, obj: Quiz):
        quiz_questions = obj.quiz_questions.select_related(
            "question__lineup", "question__place"
        ).order_by("order")
        questions = [qq.question for qq in quiz_questions]
        return QuestionSerializer(questions, many=True, context=self.context).data