from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.models.user import Role, User
from app.schemas.user import UserCreate


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(session: AsyncSession, payload: UserCreate) -> User:
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        phone_number=payload.phone_number,
        base_location=payload.base_location,
        role=payload.role,
        is_verified=payload.role != Role.WORKER,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def authenticate_user(
    session: AsyncSession, email: str, password: str
) -> User | None:
    user = await get_user_by_email(session, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


async def ensure_admin_user(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    full_name: str,
) -> User:
    if len(password.encode("utf-8")) > 72:
        raise ValueError("FIRST_ADMIN_PASSWORD must be 72 bytes or fewer for bcrypt")

    existing = await get_user_by_email(session, email)
    if existing:
        return existing

    user = User(
        email=email,
        full_name=full_name,
        hashed_password=get_password_hash(password),
        role=Role.ADMIN,
        is_verified=True,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user
