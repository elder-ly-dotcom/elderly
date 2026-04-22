from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditActionType
from app.models.elder import Elder
from app.models.sos import SOSAlert
from app.models.user import Role, User
from app.services.audit import log_audit_event
from app.tasks.celery_app import dispatch_task


async def trigger_sos_alert(
    session: AsyncSession,
    *,
    user: User,
    elder_id: int,
    message: str,
) -> SOSAlert:
    result = await session.execute(select(Elder).where(Elder.id == elder_id))
    elder = result.scalar_one_or_none()
    if not elder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Elder not found")
    if user.role == Role.CUSTOMER and elder.customer_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer can only trigger SOS for linked elders",
        )
    if user.role == Role.WORKER and elder.assigned_worker_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Worker can only trigger SOS for assigned elders",
        )

    alert = SOSAlert(elder_id=elder_id, triggered_by_id=user.id, message=message)
    session.add(alert)
    await log_audit_event(
        session,
        user_id=user.id,
        action_type=AuditActionType.SOS_TRIGGERED,
        action="sos_triggered",
        detail=f"elder_id={elder_id}",
    )
    await session.commit()
    await session.refresh(alert)

    dispatch_task("app.tasks.sos.dispatch_sos_alert", kwargs={"alert_id": alert.id})
    return alert
