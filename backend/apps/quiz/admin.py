from django.contrib import admin

from .models import Option, Question, Quiz, QuizConfig, QuizQuestion


class OptionInline(admin.TabularInline):
    model = Option
    extra = 0


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ["id", "prompt", "map", "lineup", "place", "type"]
    list_filter = ["type", "map", "place", "lineup__place"]
    inlines = [OptionInline]


@admin.register(Option)
class OptionAdmin(admin.ModelAdmin):
    list_display = ["id", "question", "text", "is_correct"]
    list_filter = ["is_correct"]


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "difficulty", "created_at"]
    filter_horizontal = ["maps"]


@admin.register(QuizConfig)
class QuizConfigAdmin(admin.ModelAdmin):
    list_display = ["hard_seconds_per_question"]


class QuizQuestionInline(admin.TabularInline):
    model = QuizQuestion
    extra = 0