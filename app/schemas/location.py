from pydantic import BaseModel, ConfigDict


class LocationSuggestion(BaseModel):
    place_id: str
    primary_text: str
    secondary_text: str | None = None
    full_text: str


class LocationResolveResponse(BaseModel):
    place_id: str
    formatted_address: str
    latitude: float
    longitude: float

    model_config = ConfigDict(extra="forbid")
