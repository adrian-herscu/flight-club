"""
Multi-tenant scoping helpers for data isolation.

Provides utilities to enforce row-level security based on school_id.
"""
from typing import Optional, Type, TypeVar
from sqlalchemy import select, Select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from src.models.base import Base

T = TypeVar("T", bound=Base)


def with_tenant_scope(
    query: Select[tuple[T]],
    school_id_column: InstrumentedAttribute,
    school_id: Optional[int],
) -> Select[tuple[T]]:
    """
    Apply tenant scoping to a query.
    
    Args:
        query: SQLAlchemy select query
        school_id_column: The school_id column to filter on
        school_id: School ID to scope to (None for super-admin, no filtering)
        
    Returns:
        Query with tenant scope applied
        
    Example:
        query = select(Course)
        query = with_tenant_scope(query, Course.school_id, current_school_id)
    """
    if school_id is None:
        # Super-admin context: no filtering
        return query
    
    # Apply school_id filter
    return query.where(school_id_column == school_id)


def get_tenant_context(user_roles: list, school_id: Optional[int] = None) -> Optional[int]:
    """
    Determine the tenant context for a user.
    
    Args:
        user_roles: List of user roles with school_id
        school_id: Requested school ID (for school switcher)
        
    Returns:
        School ID for tenant scope, or None for super-admin
        
    Raises:
        ValueError: If user requests school they don't have access to
    """
    # Check if user is super-admin
    has_super_admin = any(
        role.role_type == "super_admin" and role.school_id is None
        for role in user_roles
    )
    
    if has_super_admin:
        # Super-admin can access any school or all schools
        return school_id if school_id else None
    
    # Get list of schools user has access to
    user_schools = {role.school_id for role in user_roles if role.school_id is not None}
    
    if not user_schools:
        raise ValueError("User has no school access")
    
    if school_id is None:
        # Return first school as default
        return min(user_schools)
    
    if school_id not in user_schools:
        raise ValueError(f"User does not have access to school {school_id}")
    
    return school_id


async def verify_tenant_access(
    db: AsyncSession,
    model: Type[T],
    record_id: int,
    school_id_column: InstrumentedAttribute,
    user_school_id: Optional[int],
) -> Optional[T]:
    """
    Verify user has access to a specific record.
    
    Args:
        db: Database session
        model: SQLAlchemy model class
        record_id: Record ID to check
        school_id_column: The school_id column
        user_school_id: User's school ID (None for super-admin)
        
    Returns:
        Record if accessible, None otherwise
    """
    query = select(model).where(model.id == record_id)  # type: ignore
    query = with_tenant_scope(query, school_id_column, user_school_id)
    
    result = await db.execute(query)
    return result.scalar_one_or_none()
