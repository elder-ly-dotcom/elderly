from celery import Celery

from app.core.config import settings


celery_app = Celery(
    "elderly",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)
celery_app.conf.broker_connection_retry_on_startup = True
celery_app.conf.imports = ("app.tasks.sos", "app.tasks.emergency")


def _run_task_inline(task_name: str, kwargs: dict | None = None) -> dict[str, str]:
    payload = kwargs or {}
    if task_name == "app.tasks.sos.dispatch_sos_alert":
        from app.tasks.sos import dispatch_sos_alert

        return dispatch_sos_alert(**payload)
    if task_name == "app.tasks.emergency.dispatch_high_priority_alert":
        from app.tasks.emergency import dispatch_high_priority_alert

        return dispatch_high_priority_alert(**payload)
    return {"status": "skipped", "reason": "task_not_supported"}


def dispatch_task(task_name: str, *, kwargs: dict | None = None) -> dict[str, str]:
    if not settings.CELERY_TASKS_ENABLED:
        return _run_task_inline(task_name, kwargs=kwargs)
    try:
        celery_app.send_task(task_name, kwargs=kwargs or {})
        return {"status": "queued"}
    except Exception:
        return _run_task_inline(task_name, kwargs=kwargs)
