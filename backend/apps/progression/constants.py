"""Reglas económicas y de desbloqueo del sistema."""

# El nivel se deriva de la XP (espejo de src/lib/xp.ts): cada nivel requiere
# XP_PER_LEVEL puntos y el nivel = floor(xp / XP_PER_LEVEL) + 1.
XP_PER_LEVEL = 500

# El desbloqueo de tipos de pregunta (nivel 0 = inicial, 1+ = nivel, vacío =
# monedas) y de utilidades por nivel vive en QuestionTypeConfig (editable desde
# el panel "Tipos de pregunta"), no en constantes.

# Cantidad máxima de lugares que el usuario elige al empezar (onboarding).
# El resto de lugares se desbloquea con monedas.
STARTER_PLACE_COUNT = 5

# Costo en monedas de cada desbloqueo.
COIN_COST_MAP = 100
# El costo de un lugar es progresivo por usuario: el primero del mapa cuesta
# el base y cada lugar adicional del mismo mapa suma un step (así cada compra
# es más cara, sin depender del campo `order` del lugar).
COIN_COST_PLACE_BASE = 50
COIN_COST_PLACE_STEP = 30
# Costo plano por desbloquear un lineup (independiente del lugar).
COIN_COST_LINEUP = 60
COIN_COST_QUESTION_TYPE = 40

# Recompensas por respuesta correcta (progreso por contadores). El quiz por
# defecto tiene 5 preguntas: un quiz perfecto da 150 monedas, suficiente para
# desbloquear 1-2 lugares (los ítems más caros del juego).
XP_PER_CORRECT = 25
COINS_PER_CORRECT = 30

# Si pasan más de estas horas sin responder correcto, la racha se reinicia.
STREAK_WINDOW_HOURS = 24