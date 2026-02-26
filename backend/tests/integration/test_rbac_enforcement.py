"""
Integration test for role-based access enforcement.

Tests that role checks work correctly at the service layer.
This test MUST FAIL until RBAC service is implemented.
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.models.user_role import UserRole, RoleType
from src.services.role_service import (
    assign_role,
    get_user_roles,
    has_role,
    revoke_role,
)


@pytest.mark.asyncio
async def test_assign_role_to_user(db: AsyncSession, user: User) -> None:
    """Should assign role to user successfully."""
    role = await assign_role(db, user.id, None, RoleType.STUDENT)
    
    assert role is not None
    assert role.user_id == user.id
    assert role.role_type == RoleType.STUDENT
    assert role.school_id is None  # Super admin context


@pytest.mark.asyncio
async def test_get_user_roles(db: AsyncSession, user: User) -> None:
    """Should retrieve all roles for a user."""
    # Assign multiple roles
    await assign_role(db, user.id, None, RoleType.SUPER_ADMIN)
    await assign_role(db, user.id, 1, RoleType.ADMIN)
    
    roles = await get_user_roles(db, user.id)
    
    assert len(roles) == 2
    role_types = {r.role_type for r in roles}
    assert RoleType.SUPER_ADMIN in role_types
    assert RoleType.ADMIN in role_types


@pytest.mark.asyncio
async def test_has_role(db: AsyncSession, user: User) -> None:
    """Should correctly check if user has specific role."""
    await assign_role(db, user.id, None, RoleType.STUDENT)
    
    assert await has_role(db, user.id, RoleType.STUDENT) is True
    assert await has_role(db, user.id, RoleType.ADMIN) is False


@pytest.mark.asyncio
async def test_revoke_role(db: AsyncSession, user: User) -> None:
    """Should revoke role from user."""
    role = await assign_role(db, user.id, None, RoleType.INSTRUCTOR)
    
    await revoke_role(db, user.id, None, RoleType.INSTRUCTOR)
    
    assert await has_role(db, user.id, RoleType.INSTRUCTOR) is False


@pytest.mark.asyncio
async def test_school_scoped_roles(db: AsyncSession, user: User) -> None:
    """Should handle school-scoped roles correctly."""
    # Assign admin role for school 1
    await assign_role(db, user.id, 1, RoleType.ADMIN)
    
    # User should have admin role for school 1
    roles = await get_user_roles(db, user.id, school_id=1)
    assert len(roles) == 1
    assert roles[0].role_type == RoleType.ADMIN
    
    # But not for school 2
    roles = await get_user_roles(db, user.id, school_id=2)
    assert len(roles) == 0
