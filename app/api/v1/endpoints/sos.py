from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import require_roles
from app.db.session import get_db
from app.models.user import Role, User
from app.schemas.sos import SOSResponse, SOSTriggerRequest
from app.services.sos import trigger_sos_alert


router = APIRouter()


@router.post("/trigger", response_model=SOSResponse)
async def trigger_sos(
    payload: SOSTriggerRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.WORKER, Role.CUSTOMER))],
) -> SOSResponse:
    alert = await trigger_sos_alert(
        db,
        user=user,
        elder_id=payload.elder_id,
        message=payload.message,
    )
    return SOSResponse.model_validate(alert)
