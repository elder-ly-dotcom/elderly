from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.occasion import OccasionBookingStatus


class OccasionCatalogItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    occasion_type: str
    name: str
    emotional_line: str
    price: float
    inclusions: list[str]
    includes_video_call: bool = False


class OccasionSlotOption(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start_time: datetime
    end_time: datetime
    label: str
    available_workers: int


class OccasionBookingCreateRequest(BaseModel):
    elder_id: int | None = None
    location_address: str | None = Field(default=None, max_length=500)
    package_code: str
    scheduled_start_time: datetime
    special_notes: str | None = Field(default=None, max_length=1000)

    model_config = ConfigDict(extra="forbid")


class OccasionBookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    customer_id: int
    primary_elder_id: int
    assigned_worker_id: int | None = None
    occasion_type: str
    package_code: str
    package_name: str
    package_summary: str
    special_notes: str | None = None
    location_address_snapshot: str
    scheduled_start_time: datetime
    scheduled_end_time: datetime
    total_price: float
    includes_video_call: bool
    video_room_name: str | None = None
    update_summary: str | None = None
    photo_gallery_url: str | None = None
    status: OccasionBookingStatus
    customer_name: str | None = None
    customer_phone: str | None = None
    worker_name: str | None = None
    worker_phone: str | None = None
    created_at: datetime


class OccasionBookingDetailsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    booking: OccasionBookingResponse
    elder_names: list[str] = []
    can_join_video_call: bool = False


class OccasionBookingWorkerUpdate(BaseModel):
    status: OccasionBookingStatus
    update_summary: str | None = Field(default=None, max_length=1000)
    photo_gallery_url: str | None = Field(default=None, max_length=500)

    model_config = ConfigDict(extra="forbid")
