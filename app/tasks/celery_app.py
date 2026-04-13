from celery import Celery

from app.core.config import settings


celery_app = Celery(
    "elderly",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)
celery_app.conf.broker_connection_retry_on_startup = True
celery_app.conf.imports = ("app.tasks.sos", "app.tasks.emergency")
