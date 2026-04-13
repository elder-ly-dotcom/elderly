import httpx
from fastapi import HTTPException, status

from app.schemas.location import LocationResolveResponse, LocationSuggestion


PHOTON_URL = "https://photon.komoot.io/api"
SODEPUR_BBOX = "88.3300,22.6600,88.4500,22.7600"


async def autocomplete_addresses(query: str) -> list[LocationSuggestion]:
    if len(query.strip()) < 3:
        return []

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            PHOTON_URL,
            params={
                "q": query,
                "lang": "en",
                "limit": 6,
                "lat": 22.7083,
                "lon": 88.3910,
                "bbox": SODEPUR_BBOX,
                "location_bias_scale": 0.05,
            },
            headers={"User-Agent": "ELDERLY/1.0 (elder address search)"},
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Photon autocomplete failed")

    suggestions: list[LocationSuggestion] = []
    for feature in response.json().get("features", []):
        properties = feature.get("properties", {})
        geometry = feature.get("geometry", {})
        coordinates = geometry.get("coordinates", [])
        if len(coordinates) != 2:
            continue

        street = properties.get("street")
        city = properties.get("city") or properties.get("district") or properties.get("county")
        state = properties.get("state")
        country = properties.get("country")
        name = properties.get("name") or street or city or query
        full_text = ", ".join([part for part in [properties.get("name"), street, city, state, country] if part])
        place_id = f"{coordinates[1]}:{coordinates[0]}:{full_text or name}"

        suggestions.append(
            LocationSuggestion(
                place_id=place_id,
                primary_text=name,
                secondary_text=", ".join([part for part in [street, city, state] if part]) or None,
                full_text=full_text or name,
            )
        )
    return suggestions


async def resolve_place(place_id: str) -> LocationResolveResponse:
    try:
        latitude_raw, longitude_raw, formatted_address = place_id.split(":", 2)
        latitude = float(latitude_raw)
        longitude = float(longitude_raw)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid place id") from exc

    return LocationResolveResponse(
        place_id=place_id,
        formatted_address=formatted_address,
        latitude=latitude,
        longitude=longitude,
    )
