from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import Role


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    phone_number: str | None = Field(default=None, max_length=20)
    base_location: str | None = Field(default=None, max_length=255)
    role: Role

    model_config = ConfigDict(extra="forbid")


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    email: EmailStr
    full_name: str
    phone_number: str | None
    base_location: str | None = None
    fcm_token: str | None = None
    verification_document_url: str | None = None
    role: Role
    is_active: bool
    is_verified: bool
    available_for_dispatch: bool = True
    current_latitude: float | None = None
    current_longitude: float | None = None
    location_updated_at: datetime | None = None
    is_active_today: bool = False
    created_at: datetime


class WorkerAdminUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    phone_number: str | None = Field(default=None, max_length=20)
    base_location: str | None = Field(default=None, max_length=255)
    is_active: bool = True
    available_for_dispatch: bool = True

    model_config = ConfigDict(extra="forbid")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    model_config = ConfigDict(extra="forbid")
