"""
Integration test for syllabus lesson ordering and visibility.

Tests that lesson ordering works correctly and syllabus visibility rules are enforced.
This test MUST FAIL until syllabus service is implemented.
"""
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.syllabus import Syllabus, SyllabusStatus
from src.models.lesson import Lesson
from src.services.syllabus_service import (
    create_syllabus,
    finalize_syllabus,
    get_syllabuses,
    add_lesson_to_syllabus,
)
from src.schemas.syllabus import SyllabusCreate
from src.schemas.lesson import LessonCreate


@pytest.mark.asyncio
async def test_lesson_ordering(db: AsyncSession) -> None:
    """Lessons should be ordered correctly."""
    # Create syllabus
    syllabus_data = SyllabusCreate(
        title="Test Course",
        description="Test description",
        status=SyllabusStatus.DRAFT,
    )
    syllabus = await create_syllabus(db, syllabus_data)
    
    # Add lessons out of order
    lesson2_data = LessonCreate(title="Lesson 2", description="Second", order=2)
    lesson1_data = LessonCreate(title="Lesson 1", description="First", order=1)
    lesson3_data = LessonCreate(title="Lesson 3", description="Third", order=3)
    
    await add_lesson_to_syllabus(db, syllabus.id, lesson2_data)
    await add_lesson_to_syllabus(db, syllabus.id, lesson1_data)
    await add_lesson_to_syllabus(db, syllabus.id, lesson3_data)
    
    # Query lessons directly
    result = await db.execute(
        select(Lesson).where(Lesson.syllabus_id == syllabus.id).order_by(Lesson.order)
    )
    lessons = result.scalars().all()
    
    assert len(lessons) == 3
    assert lessons[0].title == "Lesson 1"
    assert lessons[1].title == "Lesson 2"
    assert lessons[2].title == "Lesson 3"


@pytest.mark.asyncio
async def test_draft_visibility(db: AsyncSession) -> None:
    """Draft syllabuses should only be visible to super-admins."""
    # Create draft syllabus
    draft_data = SyllabusCreate(
        title="Draft Course",
        description="Not ready yet",
        status=SyllabusStatus.DRAFT,
    )
    await create_syllabus(db, draft_data)
    
    # Get all syllabuses (super-admin context)
    all_syllabuses, _ = await get_syllabuses(db, status=None)
    assert len(all_syllabuses) >= 1
    
    # Get only final syllabuses (admin context)
    final_syllabuses, _ = await get_syllabuses(db, status=SyllabusStatus.FINAL)
    assert len(final_syllabuses) == 0  # No finalized syllabuses yet


@pytest.mark.asyncio
async def test_finalize_syllabus_increments_version(db: AsyncSession) -> None:
    """Finalizing should increment version and freeze editing."""
    # Create draft
    draft_data = SyllabusCreate(
        title="Test Course",
        description="Test",
        status=SyllabusStatus.DRAFT,
    )
    syllabus = await create_syllabus(db, draft_data)
    assert syllabus.version == 1
    
    # Add at least one lesson (required for finalization)
    lesson_data = LessonCreate(title="Lesson 1", description="First", order=1)
    await add_lesson_to_syllabus(db, syllabus.id, lesson_data)
    
    # Finalize
    finalized = await finalize_syllabus(db, syllabus.id)
    assert finalized.status == SyllabusStatus.FINAL
    assert finalized.version == 1  # Version stays same on first finalize
    
    # Attempting to add lesson to finalized syllabus should raise error
    from src.core.exceptions import APIError
    with pytest.raises(APIError, match="Cannot modify finalized syllabus"):
        lesson2_data = LessonCreate(title="Lesson 2", description="Second", order=2)
        await add_lesson_to_syllabus(db, finalized.id, lesson2_data)



@pytest.mark.asyncio
async def test_cannot_add_lessons_to_finalized_syllabus(db: AsyncSession) -> None:
    """Cannot modify lessons in finalized syllabus."""
    # Create syllabus with lesson and finalize
    draft_data = SyllabusCreate(
        title="Test Course",
        description="Test",
        status=SyllabusStatus.DRAFT,
    )
    syllabus = await create_syllabus(db, draft_data)
    
    # Add initial lesson before finalizing
    lesson1_data = LessonCreate(title="Lesson 1", description="First", order=1)
    await add_lesson_to_syllabus(db, syllabus.id, lesson1_data)
    
    # Finalize the syllabus
    finalized = await finalize_syllabus(db, syllabus.id)
    
    # Try to add another lesson (should fail)
    lesson2_data = LessonCreate(title="New Lesson", description="Test", order=2)
    
    from src.core.exceptions import APIError
    with pytest.raises(APIError, match="Cannot modify finalized syllabus"):
        await add_lesson_to_syllabus(db, finalized.id, lesson2_data)
