"""
Syllabus service for managing syllabuses and lessons.
"""
from datetime import datetime, UTC
from typing import Optional, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.exceptions import APIError
from src.models.syllabus import Syllabus, SyllabusStatus
from src.models.lesson import Lesson
from src.schemas.syllabus import SyllabusCreate, SyllabusUpdate
from src.schemas.lesson import LessonCreate


async def get_syllabuses(
    db: AsyncSession,
    status: Optional[SyllabusStatus] = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[List[Syllabus], int]:
    """
    Get syllabuses with optional status filter.
    
    Args:
        db: Database session
        status: Optional status filter (None = all, FINAL = only final)
        page: Page number
        page_size: Items per page
        
    Returns:
        Tuple of (syllabuses list, total count)
    """
    query = select(Syllabus)
    
    if status is not None:
        query = query.where(Syllabus.status == status)
    
    # Get total count
    count_query = select(func.count()).select_from(Syllabus)
    if status is not None:
        count_query = count_query.where(Syllabus.status == status)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()
    
    # Get paginated results with lessons
    query = query.options(selectinload(Syllabus.lessons))
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(Syllabus.created_at.desc())
    
    result = await db.execute(query)
    syllabuses = list(result.scalars().all())
    
    return syllabuses, total


async def get_syllabus_by_id(
    db: AsyncSession, syllabus_id: int
) -> Optional[Syllabus]:
    """Get syllabus by ID with lessons loaded."""
    query = select(Syllabus).where(Syllabus.id == syllabus_id)
    query = query.options(selectinload(Syllabus.lessons))
    
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_syllabus(
    db: AsyncSession, syllabus_data: SyllabusCreate
) -> Syllabus:
    """Create a new syllabus."""
    syllabus = Syllabus(
        title=syllabus_data.title,
        description=syllabus_data.description,
        status=syllabus_data.status,
        version=1,
    )
    
    db.add(syllabus)
    await db.commit()
    await db.refresh(syllabus)
    return syllabus


async def update_syllabus(
    db: AsyncSession, syllabus_id: int, syllabus_data: SyllabusUpdate
) -> Syllabus:
    """Update a syllabus (only if draft)."""
    syllabus = await get_syllabus_by_id(db, syllabus_id)
    
    if not syllabus:
        raise APIError(
            code="SYLLABUS_NOT_FOUND",
            message="Syllabus not found",
            status_code=404,
        )
    
    if syllabus.status == SyllabusStatus.FINAL:
        raise APIError(
            code="SYLLABUS_FINALIZED",
            message="Cannot modify finalized syllabus",
            status_code=400,
        )
    
    # Update fields
    update_data = syllabus_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(syllabus, field, value)
    
    await db.commit()
    await db.refresh(syllabus)
    return syllabus


async def finalize_syllabus(
    db: AsyncSession, syllabus_id: int
) -> Syllabus:
    """Finalize a syllabus (make it immutable and visible to admins)."""
    syllabus = await get_syllabus_by_id(db, syllabus_id)
    
    if not syllabus:
        raise APIError(
            code="SYLLABUS_NOT_FOUND",
            message="Syllabus not found",
            status_code=404,
        )
    
    if syllabus.status == SyllabusStatus.FINAL:
        raise APIError(
            code="SYLLABUS_ALREADY_FINAL",
            message="Syllabus is already finalized",
            status_code=400,
        )
    
    # Check if syllabus has lessons by querying directly
    lesson_count_result = await db.execute(
        select(func.count()).select_from(Lesson).where(Lesson.syllabus_id == syllabus_id)
    )
    lesson_count = lesson_count_result.scalar_one()
    
    if lesson_count == 0:
        raise APIError(
            code="SYLLABUS_NO_LESSONS",
            message="Cannot finalize syllabus without lessons",
            status_code=400,
        )
    
    syllabus.status = SyllabusStatus.FINAL
    syllabus.finalized_at = datetime.now(UTC)
    
    await db.commit()
    await db.refresh(syllabus)
    return syllabus


async def delete_syllabus(
    db: AsyncSession, syllabus_id: int
) -> bool:
    """Delete a syllabus (only if draft and not used by any courses)."""
    syllabus = await get_syllabus_by_id(db, syllabus_id)
    
    if not syllabus:
        return False
    
    if syllabus.status == SyllabusStatus.FINAL:
        raise APIError(
            code="SYLLABUS_FINALIZED",
            message="Cannot delete finalized syllabus",
            status_code=400,
        )
    
    await db.delete(syllabus)
    await db.commit()
    return True


async def add_lesson_to_syllabus(
    db: AsyncSession, syllabus_id: int, lesson_data: LessonCreate
) -> Lesson:
    """Add a lesson to a syllabus."""
    syllabus = await get_syllabus_by_id(db, syllabus_id)
    
    if not syllabus:
        raise APIError(
            code="SYLLABUS_NOT_FOUND",
            message="Syllabus not found",
            status_code=404,
        )
    
    if syllabus.status == SyllabusStatus.FINAL:
        raise APIError(
            code="SYLLABUS_FINALIZED",
            message="Cannot modify finalized syllabus",
            status_code=400,
        )
    
    # Check for duplicate order
    existing_lesson = await db.execute(
        select(Lesson).where(
            Lesson.syllabus_id == syllabus_id,
            Lesson.order == lesson_data.order
        )
    )
    if existing_lesson.scalar_one_or_none():
        raise APIError(
            code="LESSON_ORDER_CONFLICT",
            message=f"Lesson with order {lesson_data.order} already exists",
            status_code=400,
        )
    
    lesson = Lesson(
        syllabus_id=syllabus_id,
        title=lesson_data.title,
        description=lesson_data.description,
        order=lesson_data.order,
    )
    
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


async def update_lesson(
    db: AsyncSession, lesson_id: int, lesson_data: LessonCreate
) -> Lesson:
    """Update a lesson (only if syllabus is draft)."""
    result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id).options(selectinload(Lesson.syllabus))
    )
    lesson = result.scalar_one_or_none()
    
    if not lesson:
        raise APIError(
            code="LESSON_NOT_FOUND",
            message="Lesson not found",
            status_code=404,
        )
    
    if lesson.syllabus.status == SyllabusStatus.FINAL:
        raise APIError(
            code="SYLLABUS_FINALIZED",
            message="Cannot modify lessons in finalized syllabus",
            status_code=400,
        )
    
    lesson.title = lesson_data.title
    lesson.description = lesson_data.description
    lesson.order = lesson_data.order
    
    await db.commit()
    await db.refresh(lesson)
    return lesson


async def delete_lesson(
    db: AsyncSession, lesson_id: int
) -> bool:
    """Delete a lesson (only if syllabus is draft)."""
    result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id).options(selectinload(Lesson.syllabus))
    )
    lesson = result.scalar_one_or_none()
    
    if not lesson:
        return False
    
    if lesson.syllabus.status == SyllabusStatus.FINAL:
        raise APIError(
            code="SYLLABUS_FINALIZED",
            message="Cannot modify lessons in finalized syllabus",
            status_code=400,
        )
    
    await db.delete(lesson)
    await db.commit()
    return True
