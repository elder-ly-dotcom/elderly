from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import *
from app.models.emergency import EmergencyLog
from app.services.notification import send_high_priority_alert
from app.tasks.celery_app import celery_app


sync_engine = create_engine(settings.SYNC_DATABASE_URL, future=True)


@celery_app.task(name="app.tasks.emergency.dispatch_high_priority_alert")
def dispatch_high_priority_alert(alert_id: int, user_id: int, message: str) -> dict[str, str]:
    with Session(sync_engine) as session:
        alert = session.get(EmergencyLog, alert_id)
        if not alert:
            return {"status": "missing"}
        result = __import__("asyncio").run(send_high_priority_alert(user_id, message))
        return {"status": result["status"], "alert_id": str(alert_id)}
