from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import require_roles
from app.db.session import get_db
from app.models.user import Role, User
from app.schemas.subscription import (
    ServiceCatalogItem,
    SubscriptionCreateRequest,
    SubscriptionMetricsResponse,
    SubscriptionOverviewResponse,
    SubscriptionQuoteRequest,
    SubscriptionQuoteResponse,
    SubscriptionResponse,
)
from app.services.subscription import (
    build_subscription_quote,
    create_subscription,
    get_customer_subscription_overview,
    get_service_catalog,
    get_subscription_metrics,
    list_customer_subscriptions,
)


router = APIRouter()


@router.get("/catalog", response_model=list[ServiceCatalogItem])
async def service_catalog() -> list[ServiceCatalogItem]:
    return get_service_catalog()


@router.post("/quote", response_model=SubscriptionQuoteResponse)
async def quote_subscription(
    payload: SubscriptionQuoteRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
) -> SubscriptionQuoteResponse:
    return await build_subscription_quote(
        db,
        customer=customer,
        elder_ids=payload.elder_ids,
        service_tier_code=payload.service_tier_code,
        add_on_codes=payload.add_on_codes,
        additional_elder_count=payload.additional_elder_count,
    )


@router.post("/subscribe", response_model=list[SubscriptionResponse], status_code=status.HTTP_201_CREATED)
async def subscribe(
    payload: SubscriptionCreateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
) -> list[SubscriptionResponse]:
    subscriptions = await create_subscription(db, customer=customer, payload=payload)
    return [SubscriptionResponse.model_validate(item) for item in subscriptions]


@router.get("/me", response_model=list[SubscriptionResponse])
async def my_subscriptions(
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
) -> list[SubscriptionResponse]:
    records = await list_customer_subscriptions(db, customer)
    return [SubscriptionResponse.model_validate(item) for item in records]


@router.get("/overview", response_model=SubscriptionOverviewResponse)
async def subscription_overview(
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
) -> SubscriptionOverviewResponse:
    return await get_customer_subscription_overview(db, customer=customer)


@router.get("/metrics/mrr", response_model=SubscriptionMetricsResponse)
async def mrr_metrics(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(Role.ADMIN))],
) -> SubscriptionMetricsResponse:
    return await get_subscription_metrics(db)
