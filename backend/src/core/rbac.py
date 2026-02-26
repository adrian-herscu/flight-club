"""
Role-based access control dependencies and guards.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.auth import get_current_user
from src.core.db import get_db
from src.models.user import User
from src.models.user_role import RoleType
from src.services.role_service import has_role, get_user_roles


async def require_role(
    required_role: RoleType,
    school_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency to require a specific role.
    
    Args:
        required_role: Role type required
        school_id: Optional school ID for scoped roles
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Current user if they have the required role
        
    Raises:
        HTTPException: 403 if user doesn't have the required role
    """
    # Check for super-admin first (can access everything)
    is_super_admin = await has_role(db, current_user.id, RoleType.SUPER_ADMIN, None)
    if is_super_admin:
        return current_user
    
    # Check for required role
    has_required_role = await has_role(db, current_user.id, required_role, school_id)
    
    if not has_required_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User does not have required role: {required_role.value}",
        )
    
    return current_user


def require_super_admin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency to require super-admin role."""
    async def check():
        if not await has_role(db, current_user.id, RoleType.SUPER_ADMIN, None):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super-admin access required",
            )
        return current_user
    
    return check()


def require_admin(
    school_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency to require admin role (or super-admin)."""
    async def check():
        # Super-admin can access everything
        if await has_role(db, current_user.id, RoleType.SUPER_ADMIN, None):
            return current_user
        
        # Check admin role for specific school
        if not await has_role(db, current_user.id, RoleType.ADMIN, school_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required",
            )
        
        return current_user
    
    return check()


def require_instructor(
    school_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency to require instructor role (or higher)."""
    async def check():
        # Super-admin or admin can access
        if await has_role(db, current_user.id, RoleType.SUPER_ADMIN, None):
            return current_user
        if await has_role(db, current_user.id, RoleType.ADMIN, school_id):
            return current_user
        
        # Check instructor role
        if not await has_role(db, current_user.id, RoleType.INSTRUCTOR, school_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Instructor access required",
            )
        
        return current_user
    
    return check()
