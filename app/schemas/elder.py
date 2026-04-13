from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ElderCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    age: int = Field(ge=50, le=120)
    flat_label: str | None = Field(default=None, max_length=255)
    home_address: str = Field(min_length=5, max_length=500)
    home_latitude: float = Field(ge=-90, le=90)
    home_longitude: float = Field(ge=-180, le=180)
    pod_name: str | None = Field(default=None, max_length=255)
    emergency_contact_name: str | None = Field(default=None, max_length=255)
    emergency_contact_phone: str | None = Field(default=None, max_length=20)

    model_config = ConfigDict(extra="forbid")


class ElderAssignWorker(BaseModel):
    worker_id: int
    pod_name: str | None = Field(default=None, max_length=255)

    model_config = ConfigDict(extra="forbid")


class ElderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    customer_id: int
    assigned_worker_id: int | None
    full_name: str
    age: int
    flat_label: str | None
    home_address: str
    home_latitude: float
    home_longitude: float
    pod_name: str | None
    emergency_contact_name: str | None
    emergency_contact_phone: str | None
    created_at: datetime


class ElderUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    age: int = Field(ge=50, le=120)
    flat_label: str | None = Field(default=None, max_length=255)
    home_address: str = Field(min_length=5, max_length=500)
    home_latitude: float = Field(ge=-90, le=90)
    home_longitude: float = Field(ge=-180, le=180)
    pod_name: str | None = Field(default=None, max_length=255)
    emergency_contact_name: str | None = Field(default=None, max_length=255)
    emergency_contact_phone: str | None = Field(default=None, max_length=20)

    model_config = ConfigDict(extra="forbid")
