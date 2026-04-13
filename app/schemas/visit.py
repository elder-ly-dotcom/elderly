from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.visit import VisitStatus


class VisitCheckInRequest(BaseModel):
    elder_id: int
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    photo_data_url: str = Field(min_length=32)

    model_config = ConfigDict(extra="forbid")


class VisitTaskCreate(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    notes: str | None = None
    is_completed: bool = False

    model_config = ConfigDict(extra="forbid")


class VisitCheckOutRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    photo_data_url: str = Field(min_length=32)
    notes: str | None = None
    mood_photo_url: str | None = Field(default=None, max_length=500)
    voice_note_url: str | None = Field(default=None, max_length=500)
    tasks: list[VisitTaskCreate] = Field(default_factory=list)

    model_config = ConfigDict(extra="forbid")


class VisitRequestCreate(BaseModel):
    elder_id: int | None = None
    location_address: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=1000)

    model_config = ConfigDict(extra="forbid")


class VisitSlotOption(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start_time: datetime
    end_time: datetime
    label: str
    available_workers: int


class VisitScheduleRequest(BaseModel):
    elder_id: int | None = None
    location_address: str | None = Field(default=None, max_length=500)
    scheduled_start_time: datetime
    notes: str | None = Field(default=None, max_length=1000)

    model_config = ConfigDict(extra="forbid")


class WorkerDispatchStatusUpdate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    available_for_dispatch: bool = True

    model_config = ConfigDict(extra="forbid")


class VisitTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    title: str
    is_completed: bool
    notes: str | None


class VisitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    worker_id: int
    elder_id: int
    worker_name: str | None = None
    elder_name: str | None = None
    requested_by_id: int | None = None
    requested_by_name: str | None = None
    scheduled_start_time: datetime | None = None
    scheduled_end_time: datetime | None = None
    location_address_snapshot: str | None = None
    check_in_time: datetime | None
    check_out_time: datetime | None
    start_latitude: float | None
    start_longitude: float | None
    end_latitude: float | None
    end_longitude: float | None
    distance_meters: float | None
    status: VisitStatus
    notes: str | None
    mood_photo_url: str | None
    photo_start_url: str | None
    photo_end_url: str | None
    voice_note_url: str | None
    tasks: list[VisitTaskResponse] = []


class VisitBookingDetailsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    visit: VisitResponse
    elder_names: list[str] = []
    worker_phone: str | None = None
    customer_name: str | None = None
    status_label: str


class AdminVisitRequestItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    visit: VisitResponse
    customer_name: str | None = None
    customer_phone: str | None = None
    elder_names: list[str] = []
    worker_phone: str | None = None


class WorkerUpcomingVisitItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    visit: VisitResponse
    elder_names: list[str] = []
    customer_name: str | None = None
    customer_phone: str | None = None


class VisitSummaryItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    visit_id: int
    check_in_time: datetime | None
    check_out_time: datetime | None
    status: VisitStatus
    duration_minutes: int | None
    notes: str | None
    mood_photo_url: str | None
    photo_start_url: str | None
    photo_end_url: str | None
    voice_note_url: str | None
    tasks: list[VisitTaskResponse]


class VisitSummaryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    elder_id: int
    total_visits: int
    completed_visits: int
    recent_visits: list[VisitSummaryItem]


class VisitVerifyResponse(BaseModel):
    visit: VisitResponse
    allowed: bool
    distance_meters: float


class WorkerAssignedElder(BaseModel):
    elder_id: int
    elder_name: str
    elder_names: list[str] = []
    elder_count: int = 1
    pod_name: str | None
    home_address: str
    home_latitude: float
    home_longitude: float
    active_visit_id: int | None = None
    active_visit_started_at: datetime | None = None
    active_visit_status: VisitStatus | None = None
    pending_visit_id: int | None = None


class CustomerVisitUsageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    monthly_visit_limit: int
    subscribed_locations: int
    completed_visits_this_month: int
    remaining_visits_this_month: int


class WorkerDailySummaryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    completed_visits_today: int
    completed_emergencies_today: int
