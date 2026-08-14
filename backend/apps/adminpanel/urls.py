from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views
from .uploads import AdminUploadView

router = DefaultRouter(trailing_slash=True)
router.register("users", views.UserViewSet, basename="admin-users")
router.register("maps", views.MapViewSet, basename="admin-maps")
router.register("places", views.PlaceViewSet, basename="admin-places")
router.register("lineups", views.LineupViewSet, basename="admin-lineups")
router.register("questions", views.QuestionViewSet, basename="admin-questions")
router.register("options", views.OptionViewSet, basename="admin-options")
router.register("quizzes", views.QuizViewSet, basename="admin-quizzes")
router.register(
    "quiz-questions", views.QuizQuestionViewSet, basename="admin-quiz-questions"
)
router.register(
    "progressions", views.ProgressionViewSet, basename="admin-progressions"
)
router.register(
    "map-unlocks", views.UserMapUnlockViewSet, basename="admin-map-unlocks"
)
router.register(
    "place-unlocks", views.UserPlaceUnlockViewSet, basename="admin-place-unlocks"
)
router.register(
    "question-type-unlocks",
    views.UserQuestionTypeUnlockViewSet,
    basename="admin-question-type-unlocks",
)
router.register(
    "audit-logs", views.AdminAuditLogViewSet, basename="admin-audit-logs"
)

urlpatterns = [
    path("stats/", views.AdminStatsView.as_view(), name="admin-stats"),
    path("uploads/", AdminUploadView.as_view(), name="admin-upload"),
    path("", include(router.urls)),
]
