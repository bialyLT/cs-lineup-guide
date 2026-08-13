"""Reglas económicas y de desbloqueo del sistema."""

# Tipo de pregunta desbloqueado de forma gratuita para todos los usuarios.
DEFAULT_FREE_QUESTION_TYPES: list[str] = ["reference"]

# Costo en monedas de cada desbloqueo.
COIN_COST_MAP = 100
COIN_COST_PLACE = 60
COIN_COST_QUESTION_TYPE = 40

# Recompensas por respuesta correcta (progreso por contadores).
XP_PER_CORRECT = 20
COINS_PER_CORRECT = 2

# Si pasan más de estas horas sin responder correcto, la racha se reinicia.
STREAK_WINDOW_HOURS = 24