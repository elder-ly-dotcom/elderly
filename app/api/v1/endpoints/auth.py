from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user, require_roles
from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user import Role, User
from app.schemas.emergency import FCMTokenRequest
from app.schemas.token import Token
from app.schemas.user import LoginRequest, UserCreate, UserResponse
from app.services.auth import authenticate_user, create_user, get_user_by_email
from app.services.communications import queue_email, queue_sms
from app.services.notification import connection_manager


router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    if payload.role == Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts must be provisioned by the platform",
        )
    existing = await get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
    user = await create_user(db, payload)
    if user.role == Role.WORKER:
        queue_email(
            recipients=[user.email],
            subject="ELDERLY worker registration received",
            text_body=(
                f"Hi {user.full_name},\n\n"
                "Your worker account has been created successfully. "
                "Your approval is currently pending with the admin team. "
                "We will notify you as soon as your profile is approved.\n\n"
                "Thank you,\nELDERLY"
            ),
        )
    else:
        queue_email(
            recipients=[user.email],
            subject="Welcome to ELDERLY",
            text_body=(
                f"Hi {user.full_name},\n\n"
                "Welcome to ELDERLY. Your account is ready and you can now log in, "
                "add elders, manage subscriptions, and schedule visits.\n\n"
                "Thank you,\nELDERLY"
            ),
        )
    return UserResponse.model_validate(user)


@router.post("/login", response_model=Token)
async def login(
    payload: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Token:
    user = await authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.name,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=access_token)


@router.post("/access-token", response_model=Token)
async def login_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Token:
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.name,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=access_token)


@router.post("/workers/{user_id}/verify", response_model=UserResponse)
async def verify_worker(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(Role.ADMIN))],
) -> UserResponse:
    result = await db.execute(select(User).where(User.id == user_id, User.role == Role.WORKER))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    worker.is_verified = True
    await db.commit()
    await db.refresh(worker)
    queue_email(
        recipients=[worker.email],
        subject="Your ELDERLY worker profile is approved",
        text_body=(
            f"Hi {worker.full_name},\n\n"
            "Your worker profile has been approved by the ELDERLY admin team. "
            "You can now receive service assignments in the worker portal.\n\n"
            "Thank you,\nELDERLY"
        ),
    )
    queue_sms(
        recipients=[worker.phone_number],
        body=(
            "ELDERLY: Your worker profile is approved. "
            "You can now start receiving assignments."
        ),
    )
    return UserResponse.model_validate(worker)


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post("/me/fcm-token", response_model=UserResponse)
async def save_fcm_token(
    payload: FCMTokenRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    current_user.fcm_token = payload.fcm_token
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post("/workers/{user_id}/verification-document", response_model=UserResponse)
async def upload_verification_document(
    user_id: int,
    document_url: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(Role.ADMIN))],
) -> UserResponse:
    result = await db.execute(select(User).where(User.id == user_id, User.role == Role.WORKER))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    worker.verification_document_url = document_url
    await db.commit()
    await db.refresh(worker)
    return UserResponse.model_validate(worker)


@router.post("/workers/me/remind-approval")
async def remind_admin_for_worker_approval(
    current_user: Annotated[User, Depends(require_roles(Role.WORKER))],
) -> dict[str, bool | str]:
    if current_user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Worker is already approved")
    await connection_manager.broadcast_admin(
        {
            "type": "worker_approval_reminder",
            "worker_id": current_user.id,
            "worker_name": current_user.full_name,
            "worker_phone": current_user.phone_number,
            "message": f"{current_user.full_name} requested approval follow-up.",
        }
    )
    return {"sent": True, "message": "Approval reminder sent to admin"}
