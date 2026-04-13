from fastapi import APIRouter, Query

from app.schemas.location import LocationResolveResponse, LocationSuggestion
from app.services.location import autocomplete_addresses, resolve_place


router = APIRouter()


@router.get("/autocomplete", response_model=list[LocationSuggestion])
async def autocomplete(q: str = Query(min_length=3, max_length=200)) -> list[LocationSuggestion]:
    return await autocomplete_addresses(q)


@router.get("/resolve", response_model=LocationResolveResponse)
async def resolve(place_id: str = Query(min_length=5, max_length=255)) -> LocationResolveResponse:
    return await resolve_place(place_id)
