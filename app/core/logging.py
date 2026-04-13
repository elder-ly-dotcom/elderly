from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.security import decode_token
from app.db.session import AsyncSessionLocal
from app.models.audit import AuditActionType, AuditTrail
from app.models.user import Role


class WorkerAuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return response

        payload = decode_token(auth_header.replace("Bearer ", "", 1))
        if not payload or payload.get("role") != Role.WORKER.name:
            return response

        async with AsyncSessionLocal() as session:
            session.add(
                AuditTrail(
                    user_id=int(payload["sub"]),
                    action_type=AuditActionType.WORKER_ACTION,
                    action=f"{request.method} {request.url.path}",
                    detail=f"status={response.status_code}",
                )
            )
            await session.commit()

        return response
