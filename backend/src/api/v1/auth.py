"""
Authentication endpoints.
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.auth import get_current_user
from src.core.db import get_db
from src.core.responses import success_response
from src.models.user import User
from src.schemas.user import UserMe
from src.services.role_service import get_user_role_types

router = APIRouter()


@router.get("/me")
async def get_me(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get current authenticated user profile.
    
    Returns:
        User profile with roles
    """
    # Get user roles
    roles = await get_user_role_types(db, current_user.id)
    
    # Build response data
    user_data = UserMe(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        roles=roles,
    )
    
    return success_response(
        data=user_data.model_dump(),
        request_id=request.state.request_id,
    )
