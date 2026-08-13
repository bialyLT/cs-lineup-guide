from django.contrib import admin

from .models import Option, Question, Quiz, QuizQuestion


class OptionInline(admin.TabularInline):
    model = Option
    extra = 0


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ["id", "prompt", "map", "lineup", "type"]
    list_filter = ["type", "map", "lineup__place"]
    inlines = [OptionInline]


@admin.register(Option)
class OptionAdmin(admin.ModelAdmin):
    list_display = ["id", "question", "text", "is_correct"]
    list_filter = ["is_correct"]


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "created_at"]
    filter_horizontal = ["maps"]


class QuizQuestionInline(admin.TabularInline):
    model = QuizQuestion
    extra = 0