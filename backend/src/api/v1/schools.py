"""
Schools endpoints for managing school entities.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.auth import get_current_user
from src.core.config import settings
from src.core.db import get_db
from src.core.rbac import require_super_admin
from src.core.responses import success_response
from src.models.school import School
from src.models.user import User
from src.schemas.school import SchoolCreate, SchoolResponse, SchoolUpdate
from src.services.role_service import get_user_roles

router = APIRouter()


@router.get("/schools")
async def list_schools(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    List schools accessible to the current user.

    Super-admins see all schools.
    Other users see only their associated schools.
    """
    # In dev mode, return empty list without querying database
    if settings.dev_mode:
        return success_response(
            data=[],
            request_id=request.state.request_id,
        )

    # Get user roles to determine accessible schools
    user_roles = await get_user_roles(db, current_user.id)

    # Check if super-admin
    is_super_admin = any(
        role.role_type.value == "super_admin" and role.school_id is None
        for role in user_roles
    )

    if is_super_admin:
        # Super-admin: return all schools
        count_query = select(func.count()).select_from(School)
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        query = select(School).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        schools = result.scalars().all()
    else:
        # Regular user: return only their schools
        school_ids = {
            role.school_id for role in user_roles if role.school_id is not None
        }

        if not school_ids:
            return success_response(
                data={"items": [], "total": 0, "page": page, "page_size": page_size},
                request_id=request.state.request_id,
            )

        count_query = (
            select(func.count()).select_from(School).where(School.id.in_(school_ids))
        )
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        query = (
            select(School)
            .where(School.id.in_(school_ids))
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await db.execute(query)
        schools = result.scalars().all()

    return success_response(
        data={
            "items": [SchoolResponse.model_validate(s).model_dump() for s in schools],
            "total": total,
            "page": page,
            "page_size": page_size,
        },
        request_id=request.state.request_id,
    )


@router.get("/schools/{school_id}")
async def get_school(
    school_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get school by ID if user has access."""
    # Get user roles
    user_roles = await get_user_roles(db, current_user.id)

    # Check access
    is_super_admin = any(
        role.role_type.value == "super_admin" and role.school_id is None
        for role in user_roles
    )

    has_access = is_super_admin or any(
        role.school_id == school_id for role in user_roles
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this school",
        )

    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()

    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found",
        )

    return success_response(
        data=SchoolResponse.model_validate(school).model_dump(),
        request_id=request.state.request_id,
    )


@router.post("/schools", status_code=status.HTTP_201_CREATED)
async def create_school(
    school_data: SchoolCreate,
    request: Request,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new school (super-admin only)."""
    school = School(**school_data.model_dump())
    db.add(school)
    await db.commit()
    await db.refresh(school)

    return success_response(
        data=SchoolResponse.model_validate(school).model_dump(),
        request_id=request.state.request_id,
    )


@router.patch("/schools/{school_id}")
async def update_school(
    school_id: int,
    school_data: SchoolUpdate,
    request: Request,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update a school (super-admin only)."""
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()

    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found",
        )

    # Update fields
    update_data = school_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(school, field, value)

    await db.commit()
    await db.refresh(school)

    return success_response(
        data=SchoolResponse.model_validate(school).model_dump(),
        request_id=request.state.request_id,
    )
