from fastapi import APIRouter

from app.api.v1.endpoints import admin, auth, elders, emergency, files, locations, reports, sos, subscriptions, visits


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(locations.router, prefix="/locations", tags=["locations"])
api_router.include_router(elders.router, prefix="/elders", tags=["elders"])
api_router.include_router(subscriptions.router, prefix="/payments", tags=["subscriptions"])
api_router.include_router(visits.router, prefix="/visits", tags=["visits"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(sos.router, prefix="/sos", tags=["safety"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(emergency.router, prefix="/emergency", tags=["emergency"])
