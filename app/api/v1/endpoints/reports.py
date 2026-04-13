from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import require_roles
from app.db.session import get_db
from app.models.user import Role, User
from app.schemas.visit import CustomerVisitUsageResponse, VisitSummaryResponse, WorkerDailySummaryResponse
from app.services.visit import get_customer_visit_usage, get_visit_summary_for_customer, get_worker_daily_summary


router = APIRouter()


@router.get("/summary/{elder_id}", response_model=VisitSummaryResponse)
async def get_summary(
    elder_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
) -> VisitSummaryResponse:
    return await get_visit_summary_for_customer(db, customer=customer, elder_id=elder_id)


@router.get("/usage/monthly", response_model=CustomerVisitUsageResponse)
async def monthly_usage(
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
) -> CustomerVisitUsageResponse:
    return await get_customer_visit_usage(db, customer=customer)


@router.get("/worker/daily", response_model=WorkerDailySummaryResponse)
async def worker_daily_usage(
    db: Annotated[AsyncSession, Depends(get_db)],
    worker: Annotated[User, Depends(require_roles(Role.WORKER))],
) -> WorkerDailySummaryResponse:
    return await get_worker_daily_summary(db, worker=worker)
