"""
Integration test for Google authentication flow.

Tests user auto-provisioning on first login via Google.
This test MUST FAIL until the auth service is implemented.
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models.user import User
from src.services.auth_service import sync_user_from_token


@pytest.mark.asyncio
async def test_google_auth_creates_user_on_first_login(
    db: AsyncSession, google_jwt_payload: dict
) -> None:
    """First Google login should create a new user."""
    # Verify user doesn't exist
    result = await db.execute(
        select(User).where(User.email == google_jwt_payload["email"])
    )
    assert result.scalar_one_or_none() is None
    
    # Sync user from token
    user = await sync_user_from_token(db, google_jwt_payload)
    
    # Verify user was created
    assert user is not None
    assert user.email == google_jwt_payload["email"]
    assert user.name == google_jwt_payload.get("name")
    assert user.auth_provider == "google"
    assert user.auth_provider_id == google_jwt_payload["sub"]


@pytest.mark.asyncio
async def test_google_auth_updates_existing_user(
    db: AsyncSession, google_jwt_payload: dict
) -> None:
    """Subsequent Google logins should update existing user."""
    # Create user first
    user = await sync_user_from_token(db, google_jwt_payload)
    original_id = user.id
    
    # Update payload with new name
    updated_payload = {**google_jwt_payload, "name": "Updated Name"}
    
    # Sync again
    user = await sync_user_from_token(db, updated_payload)
    
    # Verify user was updated, not recreated
    assert user.id == original_id
    assert user.name == "Updated Name"


@pytest.mark.asyncio
async def test_google_auth_invalid_token_raises_error(
    db: AsyncSession
) -> None:
    """Invalid JWT payload should raise error."""
    invalid_payload = {"invalid": "data"}
    
    with pytest.raises(ValueError, match="email"):
        await sync_user_from_token(db, invalid_payload)
