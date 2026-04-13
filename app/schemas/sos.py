from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.sos import SOSStatus


class SOSTriggerRequest(BaseModel):
    elder_id: int
    message: str = Field(min_length=5, max_length=500)

    model_config = ConfigDict(extra="forbid")


class SOSResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    elder_id: int
    triggered_by_id: int
    message: str
    status: SOSStatus
    dispatch_result: str | None
    created_at: datetime
