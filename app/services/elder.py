from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.elder import Elder
from app.models.user import Role, User
from app.schemas.elder import ElderAssignWorker, ElderCreate, ElderUpdate


async def create_elder_for_customer(
    session: AsyncSession, customer: User, payload: ElderCreate
) -> Elder:
    elder = Elder(customer_id=customer.id, **payload.model_dump())
    session.add(elder)
    await session.commit()
    await session.refresh(elder)
    return elder


async def get_elder_by_id(session: AsyncSession, elder_id: int) -> Elder | None:
    result = await session.execute(select(Elder).where(Elder.id == elder_id))
    return result.scalar_one_or_none()


async def list_elders_for_customer(session: AsyncSession, customer: User) -> list[Elder]:
    result = await session.execute(
        select(Elder)
        .options(selectinload(Elder.assigned_worker))
        .where(Elder.customer_id == customer.id)
        .order_by(Elder.created_at.desc())
    )
    return list(result.scalars().all())


async def update_elder_for_customer(
    session: AsyncSession, customer: User, elder_id: int, payload: ElderUpdate
) -> Elder:
    result = await session.execute(
        select(Elder).where(Elder.id == elder_id, Elder.customer_id == customer.id)
    )
    elder = result.scalar_one_or_none()
    if not elder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Elder not found")
    for field, value in payload.model_dump().items():
        setattr(elder, field, value)
    await session.commit()
    await session.refresh(elder)
    return elder


async def delete_elder_for_customer(session: AsyncSession, customer: User, elder_id: int) -> None:
    result = await session.execute(
        select(Elder).where(Elder.id == elder_id, Elder.customer_id == customer.id)
    )
    elder = result.scalar_one_or_none()
    if not elder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Elder not found")
    await session.delete(elder)
    await session.commit()


async def assign_worker_to_elder(
    session: AsyncSession, elder_id: int, payload: ElderAssignWorker
) -> Elder:
    elder = await get_elder_by_id(session, elder_id)
    if not elder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Elder not found")

    worker_result = await session.execute(select(User).where(User.id == payload.worker_id))
    worker = worker_result.scalar_one_or_none()
    if not worker or worker.role != Role.WORKER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid worker")
    if not worker.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Worker must be verified before assignment",
        )

    elder.assigned_worker_id = payload.worker_id
    if payload.pod_name is not None:
        elder.pod_name = payload.pod_name
    await session.commit()
    await session.refresh(elder)
    return elder
