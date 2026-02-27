"""
JWT verification and authentication dependencies.
"""

from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import settings
from src.core.db import get_db
from src.models.user import User
from src.services.auth_service import sync_user_from_token

# Dev mode flag - allow authentication bypass for local development
DEV_MODE = settings.dev_mode if hasattr(settings, "dev_mode") else False

# Use auto_error=False in dev mode to allow requests without auth header
security = HTTPBearer(auto_error=not DEV_MODE)


async def verify_jwt_token(token: str) -> dict:
    """
    Verify JWT token from Supabase.

    Args:
        token: JWT token string

    Returns:
        Decoded JWT payload

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current authenticated user from JWT token.

    Auto-provisions user if first login.
    In dev mode, returns a mock user.

    Args:
        credentials: HTTP bearer credentials (optional in dev mode)
        db: Database session

    Returns:
        Current user

    Raises:
        HTTPException: If authentication fails (except in dev mode)
    """
    # Dev mode: return a mock user even without credentials
    if DEV_MODE:
        from datetime import datetime

        # Create a simple object that mimics User model
        class DevUser:
            id = 1
            email = "dev@local.test"
            name = "Dev User"
            auth_provider = "dev"
            auth_provider_id = "dev-provider"
            created_at = datetime.now()
            updated_at = datetime.now()

            # Relationships (for compatibility)
            enrollments = []
            lesson_evaluations = []
            instructor_assignments = []

        return DevUser()

    # Production mode: require credentials
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    token = credentials.credentials
    payload = await verify_jwt_token(token)

    # Sync user from token (creates if new, updates if existing)
    user = await sync_user_from_token(db, payload)

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise.

    Use for endpoints that work with or without authentication.
    """
    if not credentials:
        return None

    return await get_current_user(credentials, db)
