"""
Enrollments endpoints for managing student enrollments and approvals.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.auth import get_current_user
from src.core.db import get_db
from src.core.exceptions import APIError
from src.core.responses import success_response
from src.models.user import User
from src.models.user_role import RoleType
from src.schemas.student_enrollment import (
    StudentEnrollmentApprove,
    StudentEnrollmentCreate,
    StudentEnrollmentResponse,
)
from src.services import enrollment_service
from src.services.role_service import get_user_school_id, has_role

router = APIRouter()


@router.post("/enrollments", status_code=status.HTTP_201_CREATED)
async def request_enrollment(
    request: Request,
    enrollment_data: StudentEnrollmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Request enrollment in a course.

    Student requests to enroll in a course. Status starts as PENDING_APPROVAL.
    Admin must approve or reject.
    """
    # Get user's school
    school_id = await get_user_school_id(db, current_user.id)
    if not school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not associated with a school",
        )

    try:
        enrollment = await enrollment_service.request_enrollment(
            db=db,
            school_id=school_id,
            student_id=current_user.id,
            course_id=enrollment_data.course_id,
        )
        await db.commit()

        return success_response(
            data=StudentEnrollmentResponse.model_validate(enrollment),
            request_id=request.state.request_id,
        )

    except APIError as e:
        await db.rollback()
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/enrollments")
async def list_enrollments(
    request: Request,
    course_id: int = Query(None),
    student_id: int = Query(None),
    status: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    List enrollments.

    Students can only see their own enrollments.
    Admins can see all enrollments in their school.
    """
    # Get user's school
    school_id = await get_user_school_id(db, current_user.id)
    if not school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not associated with a school",
        )

    # Check if user is admin
    is_admin = await has_role(db, current_user.id, RoleType.ADMIN, school_id)
    is_super_admin = await has_role(db, current_user.id, RoleType.SUPER_ADMIN, None)

    # Non-admins can only see their own
    if not (is_admin or is_super_admin):
        student_id = current_user.id

    try:
        enrollments, total = await enrollment_service.get_enrollments(
            db=db,
            school_id=school_id,
            course_id=course_id,
            student_id=student_id,
            status=status,
            page=page,
            page_size=page_size,
        )

        items = [StudentEnrollmentResponse.model_validate(e) for e in enrollments]

        return success_response(
            data={
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
            },
            request_id=request.state.request_id,
        )

    except APIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.patch("/enrollments/{enrollment_id}/approve")
async def approve_enrollment(
    enrollment_id: int,
    request: Request,
    approval_data: StudentEnrollmentApprove,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Approve or reject an enrollment request.

    Only admins can approve/reject enrollments.
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
            detail="Only admins can approve enrollments",
        )

    try:
        enrollment = await enrollment_service.approve_enrollment(
            db=db,
            enrollment_id=enrollment_id,
            school_id=school_id,
            approval_data=approval_data,
        )
        await db.commit()

        return success_response(
            data=StudentEnrollmentResponse.model_validate(enrollment),
            request_id=request.state.request_id,
        )

    except APIError as e:
        await db.rollback()
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/enrollments/pending-approvals")
async def get_pending_approvals(
    request: Request,
    course_id: int = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get pending enrollment approvals.

    Only admins can view pending approvals.
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
            detail="Only admins can view pending approvals",
        )

    try:
        enrollments, total = await enrollment_service.get_pending_approvals(
            db=db,
            school_id=school_id,
            course_id=course_id,
            page=page,
            page_size=page_size,
        )

        items = [StudentEnrollmentResponse.model_validate(e) for e in enrollments]

        return success_response(
            data={
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
            },
            request_id=request.state.request_id,
        )

    except APIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
