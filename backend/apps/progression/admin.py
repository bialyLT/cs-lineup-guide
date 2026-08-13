from django.contrib.admin import site

from .models import Progression, UserMapUnlock, UserPlaceUnlock, UserQuestionTypeUnlock

site.register(Progression)
site.register(UserMapUnlock)
site.register(UserPlaceUnlock)
site.register(UserQuestionTypeUnlock)