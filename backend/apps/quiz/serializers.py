from rest_framework import serializers

from .models import Option, Question, Quiz


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

    class Meta:
        model = Question
        fields = ["id", "map", "lineup_id", "type", "prompt", "helper_text", "image_url", "options"]


class QuizSerializer(serializers.ModelSerializer):
    map_ids = serializers.SlugRelatedField(
        source="maps", slug_field="slug", many=True, read_only=True
    )
    questions = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ["id", "title", "map_ids", "questions"]

    def get_questions(self, obj: Quiz):
        quiz_questions = obj.quiz_questions.select_related("question").order_by("order")
        questions = [qq.question for qq in quiz_questions]
        return QuestionSerializer(questions, many=True, context=self.context).data