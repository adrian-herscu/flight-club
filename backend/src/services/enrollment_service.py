"""
Enrollment service for managing student enrollments, approvals, and waitlist logic.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.core.exceptions import APIError
from src.models.course import Course
from src.models.student_enrollment import EnrollmentStatus, StudentEnrollment
from src.schemas.student_enrollment import (
    StudentEnrollmentApprove,
    StudentEnrollmentCreate,
)


async def get_enrollments(
    db: AsyncSession,
    school_id: int,
    course_id: Optional[int] = None,
    student_id: Optional[int] = None,
    status: Optional[EnrollmentStatus] = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[List[StudentEnrollment], int]:
    """
    Get enrollments with optional filters.

    Args:
        db: Database session
        school_id: School ID (for tenancy)
        course_id: Optional course filter
        student_id: Optional student filter
        status: Optional status filter
        page: Page number
        page_size: Items per page

    Returns:
        Tuple of (enrollments list, total count)
    """
    query = select(StudentEnrollment).where(StudentEnrollment.school_id == school_id)

    if course_id is not None:
        query = query.where(StudentEnrollment.course_id == course_id)
    if student_id is not None:
        query = query.where(StudentEnrollment.student_id == student_id)
    if status is not None:
        query = query.where(StudentEnrollment.status == status)

    # Get total count
    count_query = select(func.count()).select_from(StudentEnrollment)
    count_query = count_query.where(StudentEnrollment.school_id == school_id)
    if course_id is not None:
        count_query = count_query.where(StudentEnrollment.course_id == course_id)
    if student_id is not None:
        count_query = count_query.where(StudentEnrollment.student_id == student_id)
    if status is not None:
        count_query = count_query.where(StudentEnrollment.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # For pending enrollments, include pagination
    if status == EnrollmentStatus.PENDING_APPROVAL:
        query = query.offset((page - 1) * page_size).limit(page_size)

    # Order by created_at for FIFO
    query = query.order_by(StudentEnrollment.created_at.asc())

    result = await db.execute(query)
    enrollments = list(result.scalars().all())

    return enrollments, total


async def request_enrollment(
    db: AsyncSession,
    school_id: int,
    student_id: int,
    enrollment_data: StudentEnrollmentCreate,
) -> StudentEnrollment:
    """
    Request enrollment in a course.

    Args:
        db: Database session
        school_id: School ID (from auth context)
        student_id: Student ID (from auth context)
        enrollment_data: Enrollment request data

    Returns:
        Created StudentEnrollment with status PENDING_APPROVAL

    Raises:
        APIError: If validation fails
    """
    # Verify consistency
    if (
        enrollment_data.student_id != student_id
        or enrollment_data.school_id != school_id
    ):
        raise APIError(
            status_code=403,
            message="Cannot request enrollment for different student or school",
        )

    # Check course exists and belongs to school
    course_query = select(Course).where(
        and_(Course.id == enrollment_data.course_id, Course.school_id == school_id)
    )
    course_result = await db.execute(course_query)
    course = course_result.scalar_one_or_none()

    if not course:
        raise APIError(status_code=404, message="Course not found")

    # Check if student already has active enrollment
    existing_query = select(StudentEnrollment).where(
        and_(
            StudentEnrollment.student_id == student_id,
            StudentEnrollment.course_id == enrollment_data.course_id,
            StudentEnrollment.status.in_(
                [
                    EnrollmentStatus.ENROLLED,
                    EnrollmentStatus.WAITLIST,
                    EnrollmentStatus.PENDING_APPROVAL,
                ]
            ),
        )
    )
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise APIError(
            status_code=409,
            message="Student already has active enrollment in this course",
        )

    enrollment = StudentEnrollment(
        student_id=student_id,
        course_id=enrollment_data.course_id,
        school_id=school_id,
        status=EnrollmentStatus.PENDING_APPROVAL,
    )

    db.add(enrollment)
    await db.flush()

    return enrollment


async def approve_enrollment(
    db: AsyncSession,
    enrollment_id: int,
    school_id: int,
    approval_data: StudentEnrollmentApprove,
) -> StudentEnrollment:
    """
    Approve or reject an enrollment request.

    Args:
        db: Database session
        enrollment_id: Enrollment ID
        school_id: School ID (for tenancy check)
        approval_data: Approval decision data

    Returns:
        Updated StudentEnrollment

    Raises:
        APIError: If enrollment not found or validation fails
    """
    # Get enrollment
    query = select(StudentEnrollment).where(
        and_(
            StudentEnrollment.id == enrollment_id,
            StudentEnrollment.school_id == school_id,
        )
    )
    result = await db.execute(query)
    enrollment = result.scalar_one_or_none()

    if not enrollment:
        raise APIError(status_code=404, message="Enrollment not found")

    if enrollment.status != EnrollmentStatus.PENDING_APPROVAL:
        raise APIError(
            status_code=409,
            message=f"Can only approve pending enrollments, current status: {enrollment.status}",
        )

    # Get course to check capacity
    course_query = select(Course).where(Course.id == enrollment.course_id)
    course_result = await db.execute(course_query)
    course = course_result.scalar_one_or_none()

    if not course:
        raise APIError(status_code=404, message="Course not found")

    # Count enrolled students
    enrolled_count_query = (
        select(func.count())
        .select_from(StudentEnrollment)
        .where(
            and_(
                StudentEnrollment.course_id == enrollment.course_id,
                StudentEnrollment.status == EnrollmentStatus.ENROLLED,
            )
        )
    )
    enrolled_count_result = await db.execute(enrolled_count_query)
    enrolled_count = enrolled_count_result.scalar_one()

    if approval_data.status == EnrollmentStatus.ENROLLED:
        # Check capacity
        if enrolled_count >= course.max_students:
            # Put on waitlist instead
            enrollment.status = EnrollmentStatus.WAITLIST

            # Get next waitlist position
            max_pos_query = select(func.max(StudentEnrollment.waitlist_position)).where(
                and_(
                    StudentEnrollment.course_id == enrollment.course_id,
                    StudentEnrollment.status == EnrollmentStatus.WAITLIST,
                )
            )
            max_pos_result = await db.execute(max_pos_query)
            max_pos = max_pos_result.scalar_one_or_none() or 0
            enrollment.waitlist_position = max_pos + 1
        else:
            enrollment.status = EnrollmentStatus.ENROLLED

    elif approval_data.status == EnrollmentStatus.REJECTED:
        enrollment.status = EnrollmentStatus.REJECTED
        enrollment.rejection_reason = approval_data.rejection_reason

    else:
        raise APIError(
            status_code=400,
            message=f"Invalid approval status: {approval_data.status}",
        )

    enrollment.updated_at = datetime.utcnow()

    await db.flush()

    return enrollment


async def promote_from_waitlist(
    db: AsyncSession,
    course_id: int,
    school_id: int,
) -> Optional[StudentEnrollment]:
    """
    Promote the first waitlist entry to enrolled status.

    Called when capacity opens (student unenrolls or rejects).

    Args:
        db: Database session
        course_id: Course ID
        school_id: School ID (for tenancy)

    Returns:
        Promoted StudentEnrollment or None if no waitlist
    """
    # Get first waitlist entry (ordered by waitlist_position)
    query = select(StudentEnrollment).where(
        and_(
            StudentEnrollment.course_id == course_id,
            StudentEnrollment.school_id == school_id,
            StudentEnrollment.status == EnrollmentStatus.WAITLIST,
        )
    )
    query = query.order_by(StudentEnrollment.waitlist_position.asc()).limit(1)

    result = await db.execute(query)
    enrollment = result.scalar_one_or_none()

    if enrollment:
        enrollment.status = EnrollmentStatus.ENROLLED
        enrollment.waitlist_position = None
        enrollment.updated_at = datetime.utcnow()
        await db.flush()

    return enrollment


async def get_pending_approvals(
    db: AsyncSession,
    school_id: int,
    course_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[List[StudentEnrollment], int]:
    """
    Get pending enrollment approvals for admin dashboard.

    Args:
        db: Database session
        school_id: School ID (for tenancy)
        course_id: Optional filter by course
        page: Page number
        page_size: Items per page

    Returns:
        Tuple of (pending enrollments, total count)
    """
    return await get_enrollments(
        db=db,
        school_id=school_id,
        course_id=course_id,
        status=EnrollmentStatus.PENDING_APPROVAL,
        page=page,
        page_size=page_size,
    )
