"""Smoke test del flujo API: register → maps → free-place → generate → answer → me → ranking."""
import os
import sys

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.test import Client  # noqa: E402

BASE = ""

def show(label, response):
    print(f"\n### {label} -> {response.status_code}")
    try:
        print(response.json())
    except Exception:
        print(response.content[:500])

# 1. Registro
import time

username = f"smoke_{int(time.time()) % 1000000}"
c = Client(HTTP_HOST="localhost")
r = c.post(
    f"{BASE}/api/auth/register/",
    data={"username": username, "email": f"{username}@lineup.com", "password": "supersecret1"},
    content_type="application/json",
)
show("register", r)
access = r.json()["access"]

c = Client(HTTP_HOST="localhost", HTTP_AUTHORIZATION=f"Bearer {access}")

# 2. Mapas
r = c.get(f"{BASE}/api/maps/")
show("maps", r)
maps = r.json()
mirage = next(m for m in maps if m["id"] == "mirage")
first_place_id = mirage["places"][0]["id"]

# 3. Lugar gratuito (único)
r = c.post(f"{BASE}/api/me/free-place/", data={"place_id": first_place_id}, content_type="application/json")
show("free-place", r)

# 4. Idempotencia: elegir OTRO lugar gratuito debe fallar
second_place_id = mirage["places"][1]["id"]
r = c.post(f"{BASE}/api/me/free-place/", data={"place_id": second_place_id}, content_type="application/json")
show("free-place otto lugar (espera error)", r)

# 5. Generar quiz (solo tipo reference desbloqueado gratis)
r = c.post(f"{BASE}/api/quizzes/generate/", data={"map_ids": ["mirage"]}, content_type="application/json")
show("generate quiz", r)
questions = r.json()["questions"]

# 6. Responder correcto e incorrecto (opciones traídas de la BD)
from apps.quiz.models import Option  # noqa: E402

qid = questions[0]["id"]
correct = Option.objects.get(question_id=qid, is_correct=True)
wrong = Option.objects.filter(question_id=qid, is_correct=False).first()

r = c.post(f"{BASE}/api/questions/{qid}/answer/", data={"option_id": correct.id}, content_type="application/json")
show("answer correcto", r)

r = c.post(f"{BASE}/api/questions/{qid}/answer/", data={"option_id": wrong.id}, content_type="application/json")
show("answer incorrecto (racha a 0)", r)

# 7. Me (contadores)
r = c.get(f"{BASE}/api/me/")
show("me", r)

# 8. Ranking
r = c.get(f"{BASE}/api/ranking/")
show("ranking", r)

# 9. Unlock de tipo de pregunta sin monedas (espera insufficient_coins)
r = c.post(f"{BASE}/api/me/unlock/", data={"kind": "question_type", "id": "utility"}, content_type="application/json")
show("unlock utility sin monedas (espera error)", r)