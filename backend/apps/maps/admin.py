from django.contrib import admin

from .models import Lineup, Map, Place


class PlaceInline(admin.TabularInline):
    model = Place
    extra = 0


class LineupInline(admin.TabularInline):
    model = Lineup
    extra = 0


@admin.register(Map)
class MapAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_free", "order"]
    list_editable = ["is_free", "order"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [PlaceInline]


@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = ["name", "map", "order"]
    list_filter = ["map"]
    inlines = [LineupInline]


@admin.register(Lineup)
class LineupAdmin(admin.ModelAdmin):
    list_display = ["title", "place", "util", "order"]
    list_filter = ["util", "place__map"]