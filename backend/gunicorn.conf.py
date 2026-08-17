"""Config de Gunicorn para producción (App Platform / Railway).

Ajustada para gastar poca RAM:

- 1 worker con threads (gthread): un solo proceso (~150-250 MB) que igual
  atiende varias requests a la vez sin multiplicar la memoria.
- max_requests: recicla el worker cada ~1000 requests (con jitter) para que
  la memoria no crezca por fugas lentas.
- timeout: corta requests colgadas para no bloquear el worker único.
"""

import os

bind = "0.0.0.0:" + os.environ.get("PORT", "8000")
workers = 1
worker_class = "gthread"
threads = 4
timeout = 90
max_requests = 1000
max_requests_jitter = 100