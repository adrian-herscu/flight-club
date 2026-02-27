"""
Authentication service for syncing users from JWT tokens.
"""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from src.models.user import User
from src.schemas.user import UserCreate
from src.services import user_service


async def sync_user_from_token(db: AsyncSession, jwt_payload: dict[str, Any]) -> User:
    """
    Sync user from JWT token payload.

    Creates a new user if first login, updates existing user otherwise.

    Args:
        db: Database session
        jwt_payload: Decoded JWT token payload from Supabase

    Returns:
        User object

    Raises:
        ValueError: If JWT payload is missing required fields
    """
    # Validate required fields
    if "email" not in jwt_payload:
        raise ValueError("JWT payload missing required field: email")
    if "sub" not in jwt_payload:
        raise ValueError("JWT payload missing required field: sub")

    email: str = jwt_payload["email"]
    provider_id: str = jwt_payload["sub"]
    name: str | None = jwt_payload.get("name")

    # Try to find existing user by provider ID first (most reliable)
    user = await user_service.get_user_by_auth_provider_id(db, "google", provider_id)

    if user:
        # Update user if name changed
        if name and user.name != name:
            user = await user_service.update_user(db, user, name=name)
        return user

    # Try to find by email (in case provider ID changed)
    user = await user_service.get_user_by_email(db, email)

    if user:
        # Update provider ID and name
        user.auth_provider_id = provider_id
        if name:
            user.name = name
        await db.commit()
        await db.refresh(user)
        return user

    # Create new user
    user_data = UserCreate(
        email=email,
        name=name,
        auth_provider="google",
        auth_provider_id=provider_id,
    )

    return await user_service.create_user(db, user_data)
