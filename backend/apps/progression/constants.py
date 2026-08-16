"""Reglas económicas y de desbloqueo del sistema."""

# Tipos de pregunta desbloqueados de forma gratuita para todos los usuarios.
# map_location: el contenido inicial son las preguntas de lugar.
DEFAULT_FREE_QUESTION_TYPES: list[str] = ["reference", "map_location"]

# Cantidad máxima de lugares que el usuario elige al empezar (onboarding).
# El resto de lugares se desbloquea con monedas.
STARTER_PLACE_COUNT = 5

# Costo en monedas de cada desbloqueo.
COIN_COST_MAP = 100
# El costo de un lugar es progresivo: aumenta con el orden del lugar dentro
# del mapa (lugar 1 = base, lugar 2 = base + step, ...).
COIN_COST_PLACE_BASE = 40
COIN_COST_PLACE_STEP = 20
COIN_COST_QUESTION_TYPE = 40

# Recompensas por respuesta correcta (progreso por contadores).
XP_PER_CORRECT = 20
COINS_PER_CORRECT = 2

# Si pasan más de estas horas sin responder correcto, la racha se reinicia.
STREAK_WINDOW_HOURS = 24