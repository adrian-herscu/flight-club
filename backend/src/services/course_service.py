"""
Course service for managing courses, lessons, and course administration.
"""

from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.core.exceptions import APIError
from src.models.course import Course, CourseStatus
from src.models.course_lesson import CourseLesson, CourseLessonStatus
from src.models.instructor_assignment import InstructorAssignment
from src.models.student_enrollment import EnrollmentStatus, StudentEnrollment
from src.schemas.course import CourseCreate, CourseUpdate
from src.schemas.course_lesson import CourseLessonCreate, CourseLessonUpdate


async def get_courses(
    db: AsyncSession,
    school_id: int,
    status: Optional[CourseStatus] = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[List[Course], int]:
    """
    Get courses for a school with optional status filter.

    Args:
        db: Database session
        school_id: School ID (for multi-tenancy)
        status: Optional status filter
        page: Page number
        page_size: Items per page

    Returns:
        Tuple of (courses list, total count)
    """
    query = select(Course).where(Course.school_id == school_id)

    if status is not None:
        query = query.where(Course.status == status)

    # Get total count
    count_query = (
        select(func.count()).select_from(Course).where(Course.school_id == school_id)
    )
    if status is not None:
        count_query = count_query.where(Course.status == status)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Get paginated results with lessons and enrollments
    query = query.options(
        selectinload(Course.lessons),
        selectinload(Course.enrollments),
    )
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(Course.start_date.desc())

    result = await db.execute(query)
    courses = list(result.scalars().all())

    return courses, total


async def get_course_by_id(
    db: AsyncSession, course_id: int, school_id: int
) -> Optional[Course]:
    """Get course by ID with all relationships loaded."""
    query = select(Course).where(
        and_(Course.id == course_id, Course.school_id == school_id)
    )
    query = query.options(
        selectinload(Course.lessons),
        selectinload(Course.enrollments),
        selectinload(Course.instructor_assignments),
    )

    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_course(
    db: AsyncSession, school_id: int, course_data: CourseCreate
) -> Course:
    """
    Create a new course.

    Args:
        db: Database session
        school_id: School ID (from auth context)
        course_data: Course creation data

    Returns:
        Created Course object

    Raises:
        APIError: If validation fails
    """
    # Set default dates if not provided
    start_date = course_data.start_date or datetime.utcnow()
    end_date = course_data.end_date or (datetime.utcnow() + timedelta(days=30))

    # Validate start < end
    if start_date >= end_date:
        raise APIError(
            status_code=400,
            message="Course start_date must be before end_date",
        )

    course = Course(
        school_id=school_id,
        syllabus_id=course_data.syllabus_id,
        name=course_data.name,
        description=course_data.description,
        max_students=course_data.max_students,
        status=CourseStatus.PENDING,
        start_date=start_date,
        end_date=end_date,
    )

    db.add(course)
    await db.flush()

    # Reload to get relationships
    await db.refresh(course, ["lessons", "enrollments", "instructor_assignments"])

    return course


async def update_course(
    db: AsyncSession,
    course_id: int,
    school_id: int,
    course_data: CourseUpdate,
) -> Course:
    """
    Update an existing course.

    Args:
        db: Database session
        course_id: Course ID
        school_id: School ID (for tenancy check)
        course_data: Update data

    Returns:
        Updated Course object

    Raises:
        APIError: If course not found or validation fails
    """
    course = await get_course_by_id(db, course_id, school_id)
    if not course:
        raise APIError(status_code=404, message="Course not found")

    # Update fields if provided
    if course_data.name is not None:
        course.name = course_data.name
    if course_data.description is not None:
        course.description = course_data.description
    if course_data.max_students is not None:
        course.max_students = course_data.max_students
    if course_data.start_date is not None:
        course.start_date = course_data.start_date
    if course_data.end_date is not None:
        course.end_date = course_data.end_date
    if course_data.status is not None:
        course.status = course_data.status

    # Validate start < end if both present
    if course.start_date >= course.end_date:
        raise APIError(
            status_code=400,
            message="Course start_date must be before end_date",
        )

    course.updated_at = datetime.utcnow()

    await db.flush()
    await db.refresh(course, ["lessons", "enrollments", "instructor_assignments"])

    return course


async def get_course_lessons(
    db: AsyncSession,
    course_id: int,
    school_id: int,
) -> List[CourseLesson]:
    """Get all lessons for a course."""
    query = select(CourseLesson).where(CourseLesson.course_id == course_id)

    # Verify course belongs to school
    course = await get_course_by_id(db, course_id, school_id)
    if not course:
        raise APIError(status_code=404, message="Course not found")

    query = query.options(selectinload(CourseLesson.instructor_assignments))
    query = query.order_by(CourseLesson.sequence_order)

    result = await db.execute(query)
    return list(result.scalars().all())


async def create_course_lesson(
    db: AsyncSession,
    course_id: int,
    school_id: int,
    lesson_data: CourseLessonCreate,
) -> CourseLesson:
    """
    Create a new lesson for a course.

    Args:
        db: Database session
        course_id: Course ID
        school_id: School ID (for tenancy check)
        lesson_data: Lesson creation data

    Returns:
        Created CourseLesson object

    Raises:
        APIError: If course not found or validation fails
    """
    course = await get_course_by_id(db, course_id, school_id)
    if not course:
        raise APIError(status_code=404, message="Course not found")

    # Verify lesson_data.course_id matches
    if lesson_data.course_id != course_id:
        raise APIError(
            status_code=400,
            message="Lesson course_id must match URL course_id",
        )

    lesson = CourseLesson(
        course_id=course_id,
        title=lesson_data.title,
        description=lesson_data.description,
        start_time=lesson_data.start_time,
        duration_hours=lesson_data.duration_hours,
        location=lesson_data.location,
        sequence_order=lesson_data.sequence_order,
        status=CourseLessonStatus.SCHEDULED,
    )

    db.add(lesson)
    await db.flush()
    await db.refresh(lesson, ["instructor_assignments"])

    return lesson


async def update_course_lesson(
    db: AsyncSession,
    course_id: int,
    lesson_id: int,
    school_id: int,
    lesson_data: CourseLessonUpdate,
) -> CourseLesson:
    """
    Update an existing course lesson.

    Args:
        db: Database session
        course_id: Course ID
        lesson_id: Lesson ID
        school_id: School ID (for tenancy check)
        lesson_data: Update data

    Returns:
        Updated CourseLesson object

    Raises:
        APIError: If lesson not found or validation fails
    """
    # Verify course exists and belongs to school
    course = await get_course_by_id(db, course_id, school_id)
    if not course:
        raise APIError(status_code=404, message="Course not found")

    # Get lesson
    query = select(CourseLesson).where(
        and_(CourseLesson.id == lesson_id, CourseLesson.course_id == course_id)
    )
    query = query.options(selectinload(CourseLesson.instructor_assignments))

    result = await db.execute(query)
    lesson = result.scalar_one_or_none()

    if not lesson:
        raise APIError(status_code=404, message="Lesson not found")

    # Update fields if provided
    if lesson_data.title is not None:
        lesson.title = lesson_data.title
    if lesson_data.description is not None:
        lesson.description = lesson_data.description
    if lesson_data.start_time is not None:
        lesson.start_time = lesson_data.start_time
    if lesson_data.duration_hours is not None:
        lesson.duration_hours = lesson_data.duration_hours
    if lesson_data.location is not None:
        lesson.location = lesson_data.location
    if lesson_data.sequence_order is not None:
        lesson.sequence_order = lesson_data.sequence_order
    if lesson_data.status is not None:
        lesson.status = lesson_data.status

    lesson.updated_at = datetime.utcnow()

    await db.flush()
    await db.refresh(lesson, ["instructor_assignments"])

    return lesson
