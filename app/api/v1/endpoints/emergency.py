from typing import Annotated

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user, require_roles
from app.db.session import get_db
from app.models.user import Role, User
from app.schemas.emergency import (
    EmergencyLogResponse,
    EmergencyPaymentRequest,
    EmergencyPaymentResponse,
    EmergencyResolveRequest,
    EmergencyStageUpdateRequest,
    EmergencyTriggerRequest,
)
from app.services.emergency import (
    list_emergencies_for_user,
    pay_resolved_emergencies_for_location,
    resolve_emergency,
    trigger_emergency,
    update_emergency_stage,
)
from app.services.notification import connection_manager


router = APIRouter()


@router.post("/trigger", response_model=EmergencyLogResponse)
async def create_emergency(
    payload: EmergencyTriggerRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.CUSTOMER, Role.WORKER))],
) -> EmergencyLogResponse:
    log = await trigger_emergency(db, user=user, payload=payload)
    return EmergencyLogResponse.model_validate(log)


@router.get("/history", response_model=list[EmergencyLogResponse])
async def history(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[EmergencyLogResponse]:
    logs = await list_emergencies_for_user(db, user)
    return [EmergencyLogResponse.model_validate(log) for log in logs]


@router.patch("/{alert_id}/respond", response_model=EmergencyLogResponse)
async def respond(
    alert_id: int,
    payload: EmergencyResolveRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles(Role.ADMIN))],
) -> EmergencyLogResponse:
    log = await resolve_emergency(db, admin=admin, alert_id=alert_id, payload=payload)
    return EmergencyLogResponse.model_validate(log)


@router.patch("/{alert_id}/stage", response_model=EmergencyLogResponse)
async def update_stage(
    alert_id: int,
    payload: EmergencyStageUpdateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.WORKER, Role.ADMIN))],
) -> EmergencyLogResponse:
    log = await update_emergency_stage(db, user=user, alert_id=alert_id, payload=payload)
    return EmergencyLogResponse.model_validate(log)


@router.post("/pay", response_model=EmergencyPaymentResponse)
async def pay_for_resolved_sos(
    payload: EmergencyPaymentRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
) -> EmergencyPaymentResponse:
    return await pay_resolved_emergencies_for_location(db, customer=customer, payload=payload)


@router.websocket("/ws/admin")
async def admin_ws(websocket: WebSocket) -> None:
    await connection_manager.connect_admin(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect_admin(websocket)


@router.websocket("/ws/customer/{customer_id}")
async def customer_ws(websocket: WebSocket, customer_id: int) -> None:
    await connection_manager.connect_customer(customer_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect_customer(customer_id, websocket)


@router.websocket("/ws/worker/{worker_id}")
async def worker_ws(websocket: WebSocket, worker_id: int) -> None:
    await connection_manager.connect_worker(worker_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect_worker(worker_id, websocket)
