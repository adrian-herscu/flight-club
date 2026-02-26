"""
Integration test for row-level tenant isolation.

Tests that tenant scoping works correctly at the database layer.
This test MUST FAIL until tenant scoping helpers are implemented.
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.school import School
from src.models.course import Course
from src.services.course_service import get_courses_for_school, get_course_by_id
from src.core.tenancy import with_tenant_scope


@pytest.mark.asyncio
async def test_school_isolation_at_query_level(
    db: AsyncSession, school_a: School, school_b: School
) -> None:
    """Queries should only return data for the specified school."""
    # Create course in school A
    course_a = Course(
        school_id=school_a.id,
        syllabus_id=1,
        max_students=20,
        status="planned",
    )
    db.add(course_a)
    
    # Create course in school B
    course_b = Course(
        school_id=school_b.id,
        syllabus_id=1,
        max_students=25,
        status="planned",
    )
    db.add(course_b)
    await db.commit()
    
    # Query for school A courses
    school_a_courses = await get_courses_for_school(db, school_a.id)
    assert len(school_a_courses) == 1
    assert school_a_courses[0].school_id == school_a.id
    
    # Query for school B courses
    school_b_courses = await get_courses_for_school(db, school_b.id)
    assert len(school_b_courses) == 1
    assert school_b_courses[0].school_id == school_b.id


@pytest.mark.asyncio
async def test_cannot_access_other_school_by_id(
    db: AsyncSession, school_a: School, school_b: School
) -> None:
    """Getting by ID with wrong school should return None."""
    # Create course in school B
    course_b = Course(
        school_id=school_b.id,
        syllabus_id=1,
        max_students=25,
        status="planned",
    )
    db.add(course_b)
    await db.commit()
    
    # Try to get course B with school A context
    course = await get_course_by_id(db, course_b.id, school_id=school_a.id)
    assert course is None


@pytest.mark.asyncio
async def test_super_admin_can_access_all_schools(
    db: AsyncSession, school_a: School, school_b: School
) -> None:
    """Super admin (school_id=None) should access all schools."""
    # Create courses in both schools
    course_a = Course(school_id=school_a.id, syllabus_id=1, max_students=20, status="planned")
    course_b = Course(school_id=school_b.id, syllabus_id=1, max_students=25, status="planned")
    db.add_all([course_a, course_b])
    await db.commit()
    
    # Super admin query (no school_id filter)
    all_courses = await get_courses_for_school(db, school_id=None)
    assert len(all_courses) == 2
