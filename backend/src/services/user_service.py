"""
User service for managing user operations.
"""
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.schemas.user import UserCreate


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Get user by email address."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_auth_provider_id(
    db: AsyncSession, provider: str, provider_id: str
) -> Optional[User]:
    """Get user by auth provider and provider ID."""
    result = await db.execute(
        select(User).where(
            User.auth_provider == provider,
            User.auth_provider_id == provider_id
        )
    )
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
    """Create a new user."""
    user = User(
        email=user_data.email,
        name=user_data.name,
        auth_provider=user_data.auth_provider,
        auth_provider_id=user_data.auth_provider_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user(
    db: AsyncSession, user: User, name: Optional[str] = None
) -> User:
    """Update user information."""
    if name is not None:
        user.name = name
    
    await db.commit()
    await db.refresh(user)
    return user
