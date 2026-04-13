from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditActionType, AuditTrail


async def log_audit_event(
    session: AsyncSession,
    *,
    user_id: int,
    action_type: AuditActionType,
    action: str,
    detail: str | None = None,
) -> AuditTrail:
    event = AuditTrail(
        user_id=user_id,
        action_type=action_type,
        action=action,
        detail=detail,
    )
    session.add(event)
    await session.flush()
    return event
