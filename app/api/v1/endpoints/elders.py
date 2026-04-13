from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import require_roles
from app.db.session import get_db
from app.models.user import Role, User
from app.schemas.elder import ElderAssignWorker, ElderCreate, ElderResponse, ElderUpdate
from app.services.elder import (
    assign_worker_to_elder,
    create_elder_for_customer,
    delete_elder_for_customer,
    list_elders_for_customer,
    update_elder_for_customer,
)


router = APIRouter()


@router.get("", response_model=list[ElderResponse])
async def list_elders(
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
) -> list[ElderResponse]:
    elders = await list_elders_for_customer(db, customer)
    return [ElderResponse.model_validate(elder) for elder in elders]


@router.post("", response_model=ElderResponse, status_code=status.HTTP_201_CREATED)
async def create_elder(
    payload: ElderCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
) -> ElderResponse:
    elder = await create_elder_for_customer(db, customer, payload)
    return ElderResponse.model_validate(elder)


@router.post("/{elder_id}/assign-worker", response_model=ElderResponse)
async def assign_worker(
    elder_id: int,
    payload: ElderAssignWorker,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(Role.ADMIN))],
) -> ElderResponse:
    elder = await assign_worker_to_elder(db, elder_id, payload)
    return ElderResponse.model_validate(elder)


@router.put("/{elder_id}", response_model=ElderResponse)
async def update_elder(
    elder_id: int,
    payload: ElderUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
) -> ElderResponse:
    elder = await update_elder_for_customer(db, customer, elder_id, payload)
    return ElderResponse.model_validate(elder)


@router.delete("/{elder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_elder(
    elder_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
) -> None:
    await delete_elder_for_customer(db, customer, elder_id)
