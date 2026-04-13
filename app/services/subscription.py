from collections import defaultdict
from decimal import Decimal
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.elder import Elder
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.subscription import (
    ServiceCatalogItem,
    SubscriptionCreateRequest,
    SubscriptionMetricsResponse,
    SubscriptionOverviewResponse,
    SubscriptionPlanSummary,
    SubscriptionQuoteResponse,
)
from app.services.communications import queue_email


SERVICE_CATALOG = [
    ServiceCatalogItem(
        code="bronze",
        name="Bronze Care",
        description="Essential support for seniors who need reliable digital help and regular reassurance.",
        base_price=1499,
        additional_elder_fee=799,
        highlights=[
            "Monthly digital assistance for phones and apps",
            "Routine family updates after support sessions",
            "Everyday help with payments and device setup",
        ],
        add_ons=[
            {"code": "medicine-follow-up", "name": "Medicine Follow-up", "price": 299},
            {"code": "priority-calls", "name": "Priority Family Calls", "price": 199},
        ],
    ),
    ServiceCatalogItem(
        code="silver",
        name="Silver Care",
        description="Balanced care for families who want stronger medical coordination and dependable visit support.",
        base_price=2499,
        additional_elder_fee=1299,
        highlights=[
            "Doctor appointment and prescription coordination",
            "Medicine assistance and follow-up reminders",
            "More structured support during ongoing care needs",
        ],
        add_ons=[
            {"code": "lab-pickup", "name": "Lab Pickup Coordination", "price": 399},
            {"code": "doctor-summary", "name": "Doctor Summary Note", "price": 249},
        ],
    ),
    ServiceCatalogItem(
        code="gold",
        name="Gold Care",
        description="Premium companion support with richer family visibility, errands, and high-touch peace-of-mind updates.",
        base_price=1999,
        additional_elder_fee=999,
        highlights=[
            "Companion visits with social engagement and errands",
            "Enhanced family visibility with richer visit notes",
            "Ideal for seniors needing warmer, frequent human support",
        ],
        add_ons=[
            {"code": "festival-visit", "name": "Festival Special Visit", "price": 499},
            {"code": "photo-memory", "name": "Photo Memory Album", "price": 299},
        ],
    ),
]


def _normalize_address(address: str) -> str:
    return " ".join(address.strip().lower().split())


def get_service_catalog() -> list[ServiceCatalogItem]:
    return SERVICE_CATALOG


def _find_service(code: str) -> ServiceCatalogItem:
    for item in SERVICE_CATALOG:
        if item.code == code:
            return item
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service tier not found")


def _quote(
    service: ServiceCatalogItem,
    elder_count: int,
    location_count: int,
    additional_elder_count: int,
    add_on_codes: list[str],
) -> SubscriptionQuoteResponse:
    add_ons = [addon for addon in service.add_ons if addon["code"] in add_on_codes]
    total = (
        (service.base_price * location_count)
        + (service.additional_elder_fee * additional_elder_count)
        + sum(float(addon["price"]) for addon in add_ons)
    )
    return SubscriptionQuoteResponse(
        elder_count=elder_count,
        service_tier_code=service.code,
        service_tier_name=service.name,
        base_price=service.base_price * location_count,
        additional_elder_fee=service.additional_elder_fee,
        additional_elder_count=additional_elder_count,
        add_ons=add_ons,
        total_price=total,
    )


def _build_plan_summaries(subscriptions: list[Subscription]) -> list[SubscriptionPlanSummary]:
    grouped: dict[str, list[Subscription]] = defaultdict(list)
    for record in subscriptions:
        grouped[record.plan_group_id].append(record)

    summaries: list[SubscriptionPlanSummary] = []
    for plan_group_id, items in grouped.items():
        first = items[0]
        summaries.append(
            SubscriptionPlanSummary(
                plan_group_id=plan_group_id,
                service_tier_code=first.service_tier_code,
                service_tier_name=first.service_tier_name,
                status=first.status,
                billing_cycle=first.billing_cycle,
                elder_count=len(items),
                total_price=float(sum(float(item.total_price) for item in items)),
                elders=[
                    {
                        "elder_id": item.elder_id,
                        "elder_name": item.elder.full_name if item.elder else None,
                    }
                    for item in items
                ],
                add_ons=first.add_ons,
                created_at=max(item.created_at for item in items),
            )
        )

    summaries.sort(key=lambda item: item.created_at, reverse=True)
    return summaries


async def build_subscription_quote(
    session: AsyncSession,
    *,
    customer: User,
    elder_ids: list[int],
    service_tier_code: str,
    add_on_codes: list[str],
    additional_elder_count: int | None = None,
) -> SubscriptionQuoteResponse:
    elders_result = await session.execute(
        select(Elder).where(Elder.id.in_(elder_ids), Elder.customer_id == customer.id)
    )
    elders = elders_result.scalars().all()
    if len(elders) != len(set(elder_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid elder selection")
    grouped_by_location: dict[str, list[Elder]] = defaultdict(list)
    for elder in elders:
        grouped_by_location[_normalize_address(elder.home_address)].append(elder)
    location_count = len(grouped_by_location)
    derived_additional_elder_count = sum(max(len(items) - 2, 0) for items in grouped_by_location.values())
    if additional_elder_count is not None and additional_elder_count != derived_additional_elder_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Additional elder count must match the selected elders.",
        )
    service = _find_service(service_tier_code)
    return _quote(service, len(elders), location_count, derived_additional_elder_count, add_on_codes)


async def create_subscription(
    session: AsyncSession,
    *,
    customer: User,
    payload: SubscriptionCreateRequest,
) -> list[Subscription]:
    if not payload.review_accepted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Review plan before subscribe")

    quote = await build_subscription_quote(
        session,
        customer=customer,
        elder_ids=payload.elder_ids,
        service_tier_code=payload.service_tier_code,
        add_on_codes=payload.add_on_codes,
        additional_elder_count=payload.additional_elder_count,
    )

    existing_result = await session.execute(
        select(Subscription).where(
            Subscription.customer_id == customer.id,
            Subscription.elder_id.in_(payload.elder_ids),
            Subscription.status == "ACTIVE",
        )
    )
    for existing in existing_result.scalars().all():
        existing.status = "UPGRADED"

    plan_group_id = uuid4().hex
    total_per_elder = Decimal(str(quote.total_price / quote.elder_count))
    subscriptions: list[Subscription] = []
    for elder_id in payload.elder_ids:
        sub = Subscription(
            customer_id=customer.id,
            elder_id=elder_id,
            plan_group_id=plan_group_id,
            service_tier_code=quote.service_tier_code,
            service_tier_name=quote.service_tier_name,
            add_ons=quote.add_ons,
            total_price=total_per_elder,
            status="ACTIVE",
        )
        session.add(sub)
        subscriptions.append(sub)
    await session.commit()
    created_ids = [sub.id for sub in subscriptions]
    result = await session.execute(
        select(Subscription)
        .options(
            selectinload(Subscription.elder),
            selectinload(Subscription.customer),
        )
        .where(Subscription.id.in_(created_ids))
        .order_by(Subscription.created_at.desc())
    )
    created = list(result.scalars().all())
    elder_names = [
        item.elder.full_name
        for item in created
        if item.elder is not None
    ]
    queue_email(
        recipients=[customer.email],
        subject=f"ELDERLY subscription confirmed: {quote.service_tier_name}",
        text_body=(
            f"Hi {customer.full_name},\n\n"
            f"Your {quote.service_tier_name} subscription is now active.\n"
            f"Locations covered: {len({ _normalize_address(item.elder.home_address) for item in created if item.elder })}\n"
            f"Elders included: {', '.join(elder_names)}\n"
            f"Total amount: Rs. {quote.total_price:.0f}\n\n"
            "You can review your plan details anytime from the customer portal.\n\n"
            "Thank you,\nELDERLY"
        ),
    )
    return created


async def list_customer_subscriptions(session: AsyncSession, customer: User) -> list[Subscription]:
    result = await session.execute(
        select(Subscription)
        .options(
            selectinload(Subscription.elder),
            selectinload(Subscription.customer),
        )
        .where(Subscription.customer_id == customer.id)
        .order_by(Subscription.created_at.desc())
    )
    return list(result.scalars().all())


async def get_customer_subscription_overview(
    session: AsyncSession,
    *,
    customer: User,
) -> SubscriptionOverviewResponse:
    subscriptions = await list_customer_subscriptions(session, customer)
    plan_history = _build_plan_summaries(subscriptions)
    current_plan = next((item for item in plan_history if item.status == "ACTIVE"), None)
    return SubscriptionOverviewResponse(
        has_active_plan=current_plan is not None,
        current_plan=current_plan,
        plan_history=plan_history,
    )


async def get_subscription_metrics(session: AsyncSession) -> SubscriptionMetricsResponse:
    result = await session.execute(
        select(
            func.count(Subscription.id),
            func.coalesce(func.sum(Subscription.total_price), 0),
        ).where(Subscription.status == "ACTIVE")
    )
    active_subscriptions, total_mrr = result.one()
    return SubscriptionMetricsResponse(
        active_subscriptions=active_subscriptions or 0,
        total_mrr=float(total_mrr or 0),
    )
