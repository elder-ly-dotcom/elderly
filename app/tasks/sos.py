from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import *
from app.models.sos import SOSAlert, SOSStatus
from app.tasks.celery_app import celery_app


sync_engine = create_engine(settings.SYNC_DATABASE_URL, future=True)


@celery_app.task(name="app.tasks.sos.dispatch_sos_alert")
def dispatch_sos_alert(alert_id: int) -> dict[str, str]:
    with Session(sync_engine) as session:
        alert = session.get(SOSAlert, alert_id)
        if not alert:
            return {"status": "missing"}

        alert.status = SOSStatus.SENT
        alert.dispatch_result = (
            f"Simulated notification sent via SMS/Email to customer and "
            f"emergency contacts via {settings.SOS_ALERT_EMAIL}"
        )
        session.add(alert)
        session.commit()
        return {"status": "sent"}
