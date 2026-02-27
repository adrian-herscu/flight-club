"""
Instructor assignments endpoints for managing instructor assignments and overbooking prevention.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.auth import get_current_user
from src.core.db import get_db
from src.core.exceptions import APIError
from src.core.responses import success_response
from src.models.user import User
from src.models.user_role import RoleType
from src.schemas.instructor_assignment import (
    InstructorAssignmentCreate,
    InstructorAssignmentResponse,
)
from src.services import instructor_service
from src.services.role_service import get_user_school_id, has_role

router = APIRouter()


@router.post("/instructor-assignments")
async def assign_instructor_to_lesson(
    request: Request,
    assignment_data: InstructorAssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Assign instructor to a lesson with overbooking prevention.

    Only admins can assign instructors.
    Will fail if instructor has scheduling conflict at same location with overlapping time.
    """
    # Get user's school
    school_id = await get_user_school_id(db, current_user.id)
    if not school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not associated with a school",
        )

    # Check permission
    is_admin = await has_role(db, current_user.id, RoleType.ADMIN, school_id)
    is_super_admin = await has_role(db, current_user.id, RoleType.SUPER_ADMIN, None)

    if not (is_admin or is_super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can assign instructors",
        )

    # Verify school_id matches
    if assignment_data.school_id != school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot assign instructor to different school",
        )

    try:
        assignment = await instructor_service.assign_instructor_to_lesson(
            db=db,
            school_id=school_id,
            assignment_data=assignment_data,
        )
        await db.commit()

        return success_response(
            data=InstructorAssignmentResponse.model_validate(assignment),
            status_code=status.HTTP_201_CREATED,
            request_id=request.state.request_id,
        )

    except APIError as e:
        await db.rollback()
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message,
            headers={"X-Detail": str(e.detail) if hasattr(e, "detail") else None},
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/instructor-assignments")
async def list_instructor_assignments(
    request: Request,
    instructor_id: int = Query(None),
    course_id: int = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    List instructor assignments.
    """
    # Get user's school
    school_id = await get_user_school_id(db, current_user.id)
    if not school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not associated with a school",
        )

    try:
        assignments = await instructor_service.get_instructor_assignments(
            db=db,
            school_id=school_id,
            instructor_id=instructor_id,
            course_id=course_id,
        )

        items = [InstructorAssignmentResponse.model_validate(a) for a in assignments]

        return success_response(
            data={"items": items},
            request_id=request.state.request_id,
        )

    except APIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.delete("/instructor-assignments/{assignment_id}")
async def remove_instructor_assignment(
    assignment_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Remove an instructor assignment.

    Only admins can remove assignments.
    """
    # Get user's school
    school_id = await get_user_school_id(db, current_user.id)
    if not school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not associated with a school",
        )

    # Check permission
    is_admin = await has_role(db, current_user.id, RoleType.ADMIN, school_id)
    is_super_admin = await has_role(db, current_user.id, RoleType.SUPER_ADMIN, None)

    if not (is_admin or is_super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can remove assignments",
        )

    try:
        await instructor_service.remove_instructor_assignment(
            db=db,
            assignment_id=assignment_id,
            school_id=school_id,
        )
        await db.commit()

        return success_response(
            data={"message": "Assignment removed"},
            request_id=request.state.request_id,
        )

    except APIError as e:
        await db.rollback()
        raise HTTPException(status_code=e.status_code, detail=e.message)
