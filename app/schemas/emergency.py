from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.emergency import EmergencyStage, EmergencyStatus


class EmergencyTriggerRequest(BaseModel):
    elder_id: int | None = None
    location_address: str | None = Field(default=None, max_length=500)
    message: str = Field(min_length=5, max_length=500)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    audio_note_url: str | None = Field(default=None, max_length=500)

    model_config = ConfigDict(extra="forbid")


class EmergencyResolveRequest(BaseModel):
    action_taken: str = Field(min_length=3, max_length=2000)

    model_config = ConfigDict(extra="forbid")


class EmergencyStageUpdateRequest(BaseModel):
    stage: EmergencyStage
    note: str | None = Field(default=None, max_length=1000)

    model_config = ConfigDict(extra="forbid")


class EmergencyStageUpdateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    emergency_log_id: int
    stage: EmergencyStage
    note: str | None
    updated_by_id: int | None
    updated_by_name: str | None = None
    updated_by_phone: str | None = None
    updated_by_role: str | None = None
    created_at: datetime


class EmergencyWorkerCandidateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    worker_id: int
    worker_name: str | None = None
    worker_phone: str | None = None
    distance_km: float | None
    status: str
    siren_active: bool
    accepted_at: datetime | None
    released_at: datetime | None
    created_at: datetime


class EmergencyPaymentRequest(BaseModel):
    location_address: str = Field(min_length=5, max_length=500)

    model_config = ConfigDict(extra="forbid")


class EmergencyPaymentResponse(BaseModel):
    location_address: str
    paid_alert_count: int
    total_paid_amount: float


class EmergencyLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    elder_id: int
    elder_name: str | None = None
    elder_names: list[str] = []
    location_address: str | None = None
    location_emergency_count: int = 0
    triggered_by_id: int
    triggered_by_name: str | None = None
    triggered_by_phone: str | None = None
    assigned_worker_id: int | None
    assigned_worker_name: str | None = None
    assigned_worker_phone: str | None = None
    responder_id: int | None
    responder_name: str | None = None
    responder_phone: str | None = None
    message: str
    trigger_latitude: float | None
    trigger_longitude: float | None
    audio_note_url: str | None
    start_time: datetime
    resolution_time: datetime | None
    action_taken: str | None
    current_stage: EmergencyStage
    status: EmergencyStatus
    service_fee_amount: float = 399
    service_fee_paid: bool = False
    service_fee_paid_at: datetime | None = None
    candidate_workers_notified: int = 0
    worker_candidates: list[EmergencyWorkerCandidateResponse] = []
    stage_updates: list[EmergencyStageUpdateResponse] = []


class FCMTokenRequest(BaseModel):
    fcm_token: str = Field(min_length=20, max_length=512)

    model_config = ConfigDict(extra="forbid")
