from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ServiceCatalogItem(BaseModel):
    code: str
    name: str
    description: str
    base_price: float
    additional_elder_fee: float
    highlights: list[str] = Field(default_factory=list)
    add_ons: list[dict[str, float | str]]


class SubscriptionQuoteRequest(BaseModel):
    elder_ids: list[int] = Field(min_length=1)
    service_tier_code: str
    add_on_codes: list[str] = Field(default_factory=list)
    additional_elder_count: int = Field(default=0, ge=0)

    model_config = ConfigDict(extra="forbid")


class SubscriptionQuoteResponse(BaseModel):
    elder_count: int
    service_tier_code: str
    service_tier_name: str
    base_price: float
    additional_elder_fee: float
    additional_elder_count: int
    add_ons: list[dict]
    total_price: float


class SubscriptionCreateRequest(SubscriptionQuoteRequest):
    review_accepted: bool = True


class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    elder_id: int
    plan_group_id: str
    customer_name: str | None = None
    elder_name: str | None = None
    service_tier_code: str
    service_tier_name: str
    add_ons: list[dict]
    billing_cycle: str
    total_price: float
    status: str
    created_at: datetime


class SubscriptionMetricsResponse(BaseModel):
    active_subscriptions: int
    total_mrr: float


class SubscriptionPlanSummary(BaseModel):
    plan_group_id: str
    service_tier_code: str
    service_tier_name: str
    status: str
    billing_cycle: str
    elder_count: int
    total_price: float
    elders: list[dict]
    add_ons: list[dict]
    created_at: datetime


class SubscriptionOverviewResponse(BaseModel):
    has_active_plan: bool
    current_plan: SubscriptionPlanSummary | None = None
    plan_history: list[SubscriptionPlanSummary] = Field(default_factory=list)
