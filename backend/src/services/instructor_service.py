"""
Instructor assignment service for managing instructor assignments and overbooking prevention.
"""

from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.core.exceptions import APIError
from src.models.course import Course
from src.models.course_lesson import CourseLesson
from src.models.instructor_assignment import InstructorAssignment
from src.schemas.instructor_assignment import InstructorAssignmentCreate


async def check_overbooking(
    db: AsyncSession,
    instructor_id: int,
    course_lesson_id: int,
    school_id: int,
) -> Optional[dict]:
    """
    Check if assigning instructor to lesson would cause overbooking.

    Overbooking occurs when:
    - Same instructor
    - Same location
    - Overlapping time windows

    Args:
        db: Database session
        instructor_id: Instructor ID
        course_lesson_id: Course lesson ID to check
        school_id: School ID (for tenancy)

    Returns:
        Dictionary with conflict details if conflict found, None otherwise

    Raises:
        APIError: If lesson not found
    """
    # Get the lesson to check
    lesson_query = select(CourseLesson).where(CourseLesson.id == course_lesson_id)
    lesson_result = await db.execute(lesson_query)
    lesson = lesson_result.scalar_one_or_none()

    if not lesson:
        raise APIError(status_code=404, message="Lesson not found")

    # If lesson has no scheduled time or location, no conflict possible
    if not lesson.start_time or not lesson.location:
        return None

    # Get instructor's other assignments in same school
    assignments_query = select(InstructorAssignment).where(
        and_(
            InstructorAssignment.instructor_id == instructor_id,
            InstructorAssignment.school_id == school_id,
        )
    )
    assignments_query = assignments_query.options(
        selectinload(InstructorAssignment.course_lesson)
    )

    assignments_result = await db.execute(assignments_query)
    assignments = list(assignments_result.scalars().all())

    # Check for conflicts
    lesson_end = lesson.start_time + timedelta(hours=lesson.duration_hours)

    for assignment in assignments:
        if not assignment.course_lesson:
            # Course-level assignment - need to check all lessons in that course
            course_lessons_query = select(CourseLesson).where(
                CourseLesson.course_id == assignment.course_id
            )
            course_lessons_result = await db.execute(course_lessons_query)
            course_lessons = list(course_lessons_result.scalars().all())

            for other_lesson in course_lessons:
                if (
                    other_lesson.location == lesson.location
                    and other_lesson.start_time
                    and other_lesson.id != course_lesson_id
                ):
                    other_end = other_lesson.start_time + timedelta(
                        hours=other_lesson.duration_hours
                    )
                    if _time_windows_overlap(
                        lesson.start_time,
                        lesson_end,
                        other_lesson.start_time,
                        other_end,
                    ):
                        return {
                            "conflicting_lesson_id": other_lesson.id,
                            "conflicting_lesson_title": other_lesson.title,
                            "conflicting_location": other_lesson.location,
                            "conflicting_start": other_lesson.start_time.isoformat(),
                            "conflicting_end": other_end.isoformat(),
                        }
        else:
            # Lesson-level assignment - check directly
            other_lesson = assignment.course_lesson
            if (
                other_lesson.location == lesson.location
                and other_lesson.start_time
                and other_lesson.id != course_lesson_id
            ):
                other_end = other_lesson.start_time + timedelta(
                    hours=other_lesson.duration_hours
                )
                if _time_windows_overlap(
                    lesson.start_time, lesson_end, other_lesson.start_time, other_end
                ):
                    return {
                        "conflicting_lesson_id": other_lesson.id,
                        "conflicting_lesson_title": other_lesson.title,
                        "conflicting_location": other_lesson.location,
                        "conflicting_start": other_lesson.start_time.isoformat(),
                        "conflicting_end": other_end.isoformat(),
                    }

    return None


def _time_windows_overlap(
    start1: datetime, end1: datetime, start2: datetime, end2: datetime
) -> bool:
    """Check if two time windows overlap."""
    return start1 < end2 and start2 < end1


async def assign_instructor_to_lesson(
    db: AsyncSession,
    school_id: int,
    assignment_data: InstructorAssignmentCreate,
) -> InstructorAssignment:
    """
    Assign instructor to a lesson with overbooking prevention.

    Args:
        db: Database session
        school_id: School ID (for tenancy check)
        assignment_data: Assignment creation data

    Returns:
        Created InstructorAssignment

    Raises:
        APIError: If validation fails or overbooking detected
    """
    # Verify school_id matches
    if assignment_data.school_id != school_id:
        raise APIError(
            status_code=403,
            message="Cannot assign to different school",
        )

    # Get course to verify it belongs to school
    course_query = select(Course).where(
        and_(Course.id == assignment_data.course_id, Course.school_id == school_id)
    )
    course_result = await db.execute(course_query)
    course = course_result.scalar_one_or_none()

    if not course:
        raise APIError(status_code=404, message="Course not found")

    # Check for lesson-level assignment
    if assignment_data.course_lesson_id is not None:
        lesson_query = select(CourseLesson).where(
            CourseLesson.id == assignment_data.course_lesson_id
        )
        lesson_result = await db.execute(lesson_query)
        lesson = lesson_result.scalar_one_or_none()

        if not lesson or lesson.course_id != assignment_data.course_id:
            raise APIError(status_code=404, message="Lesson not found in course")

        # Check for overbooking
        conflict = await check_overbooking(
            db=db,
            instructor_id=assignment_data.instructor_id,
            course_lesson_id=assignment_data.course_lesson_id,
            school_id=school_id,
        )

        if conflict:
            raise APIError(
                status_code=409,
                message="Instructor scheduling conflict detected",
                detail=conflict,
            )

    # Check if course-level assignment already exists
    if assignment_data.course_lesson_id is None:
        existing_query = select(InstructorAssignment).where(
            and_(
                InstructorAssignment.instructor_id == assignment_data.instructor_id,
                InstructorAssignment.course_id == assignment_data.course_id,
                InstructorAssignment.course_lesson_id.is_(None),
            )
        )
        existing_result = await db.execute(existing_query)
        if existing_result.scalar_one_or_none():
            raise APIError(
                status_code=409,
                message="Instructor already assigned to this course at course level",
            )

    assignment = InstructorAssignment(
        instructor_id=assignment_data.instructor_id,
        course_id=assignment_data.course_id,
        course_lesson_id=assignment_data.course_lesson_id,
        school_id=school_id,
        assigned_at=datetime.utcnow(),
    )

    db.add(assignment)
    await db.flush()

    return assignment


async def get_instructor_assignments(
    db: AsyncSession,
    school_id: int,
    instructor_id: Optional[int] = None,
    course_id: Optional[int] = None,
) -> List[InstructorAssignment]:
    """
    Get instructor assignments with optional filters.

    Args:
        db: Database session
        school_id: School ID (for tenancy)
        instructor_id: Optional instructor filter
        course_id: Optional course filter

    Returns:
        List of InstructorAssignment objects
    """
    query = select(InstructorAssignment).where(
        InstructorAssignment.school_id == school_id
    )

    if instructor_id is not None:
        query = query.where(InstructorAssignment.instructor_id == instructor_id)
    if course_id is not None:
        query = query.where(InstructorAssignment.course_id == course_id)

    query = query.options(selectinload(InstructorAssignment.course_lesson))
    query = query.order_by(InstructorAssignment.assigned_at.desc())

    result = await db.execute(query)
    return list(result.scalars().all())


async def remove_instructor_assignment(
    db: AsyncSession,
    assignment_id: int,
    school_id: int,
) -> None:
    """
    Remove an instructor assignment.

    Args:
        db: Database session
        assignment_id: Assignment ID
        school_id: School ID (for tenancy check)

    Raises:
        APIError: If assignment not found
    """
    query = select(InstructorAssignment).where(
        and_(
            InstructorAssignment.id == assignment_id,
            InstructorAssignment.school_id == school_id,
        )
    )
    result = await db.execute(query)
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise APIError(status_code=404, message="Assignment not found")

    await db.delete(assignment)
    await db.flush()
