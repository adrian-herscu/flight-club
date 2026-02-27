"""
Role service for managing user roles and permissions.
"""

from typing import Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.user_role import RoleType, UserRole


async def get_user_roles(
    db: AsyncSession, user_id: int, school_id: Optional[int] = None
) -> list[UserRole]:
    """
    Get all roles for a user, optionally filtered by school.

    Args:
        db: Database session
        user_id: User ID
        school_id: Optional school ID to filter by

    Returns:
        List of user roles
    """
    query = select(UserRole).where(UserRole.user_id == user_id)

    if school_id is not None:
        query = query.where(UserRole.school_id == school_id)

    result = await db.execute(query)
    return list(result.scalars().all())


async def has_role(
    db: AsyncSession,
    user_id: int,
    role_type: RoleType,
    school_id: Optional[int] = None,
) -> bool:
    """
    Check if user has a specific role.

    For school-scoped roles, checks exact match.
    For super-admin, checks global role (school_id is NULL).

    Args:
        db: Database session
        user_id: User ID
        role_type: Role type to check
        school_id: School ID (None for super-admin check)

    Returns:
        True if user has the role
    """
    query = select(UserRole).where(
        and_(
            UserRole.user_id == user_id,
            UserRole.role_type == role_type,
            UserRole.school_id == school_id,
        )
    )

    result = await db.execute(query)
    return result.scalar_one_or_none() is not None


async def assign_role(
    db: AsyncSession,
    user_id: int,
    school_id: Optional[int],
    role_type: RoleType,
) -> UserRole:
    """
    Assign a role to a user.

    Args:
        db: Database session
        user_id: User ID
        school_id: School ID (None for super-admin)
        role_type: Role type to assign

    Returns:
        Created user role
    """
    # Check if role already exists
    existing = await has_role(db, user_id, role_type, school_id)
    if existing:
        # Return existing role
        result = await db.execute(
            select(UserRole).where(
                and_(
                    UserRole.user_id == user_id,
                    UserRole.role_type == role_type,
                    UserRole.school_id == school_id,
                )
            )
        )
        return result.scalar_one()

    # Create new role
    role = UserRole(
        user_id=user_id,
        school_id=school_id,
        role_type=role_type,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


async def revoke_role(
    db: AsyncSession,
    user_id: int,
    school_id: Optional[int],
    role_type: RoleType,
) -> bool:
    """
    Revoke a role from a user.

    Args:
        db: Database session
        user_id: User ID
        school_id: School ID (None for super-admin)
        role_type: Role type to revoke

    Returns:
        True if role was revoked
    """
    result = await db.execute(
        select(UserRole).where(
            and_(
                UserRole.user_id == user_id,
                UserRole.role_type == role_type,
                UserRole.school_id == school_id,
            )
        )
    )
    role = result.scalar_one_or_none()

    if role:
        await db.delete(role)
        await db.commit()
        return True

    return False


async def get_user_role_types(
    db: AsyncSession, user_id: int, school_id: Optional[int] = None
) -> list[str]:
    """
    Get all role type strings for a user.

    Used for /me endpoint response.

    Args:
        db: Database session
        user_id: User ID
        school_id: Optional school ID to filter by

    Returns:
        List of role type strings
    """
    roles = await get_user_roles(db, user_id, school_id)
    return [role.role_type.value for role in roles]


async def get_user_school_id(db: AsyncSession, user_id: int) -> Optional[int]:
    """
    Get the school_id for a user.

    Users should have exactly one school_id (except super-admins).
    Returns the first non-NULL school_id found.

    Args:
        db: Database session
        user_id: User ID

    Returns:
        School ID or None if user is only super-admin or has no roles
    """
    roles = await get_user_roles(db, user_id)

    # Return first school_id that's not NULL
    for role in roles:
        if role.school_id is not None:
            return role.school_id

    return None
