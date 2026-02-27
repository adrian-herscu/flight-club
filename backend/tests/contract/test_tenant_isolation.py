"""
Contract test for multi-tenant isolation.

Tests that tenant data is properly isolated at the API level.
This test MUST FAIL until tenant scoping is implemented.
"""

import pytest
from httpx import AsyncClient
from src.models.course import Course


@pytest.mark.asyncio
async def test_admin_cannot_access_other_school_courses(
    admin_client: AsyncClient, school_b_course: Course
) -> None:
    """Admin from school A should not see school B courses."""
    response = await admin_client.get(f"/api/v1/courses/{school_b_course.id}")

    # Should get 404 or 403, not 200
    assert response.status_code in [403, 404]


@pytest.mark.asyncio
async def test_admin_cannot_modify_other_school_data(
    admin_client: AsyncClient, school_b_course: Course
) -> None:
    """Admin from school A should not modify school B courses."""
    response = await admin_client.patch(
        f"/api/v1/courses/{school_b_course.id}", json={"max_students": 30}
    )

    # Should be forbidden or not found
    assert response.status_code in [403, 404]


@pytest.mark.asyncio
async def test_student_cannot_see_other_school_courses(
    student_client: AsyncClient, school_b_course: Course
) -> None:
    """Student from school A should not see school B courses."""
    response = await student_client.get(f"/api/v1/courses/{school_b_course.id}")

    assert response.status_code in [403, 404]


@pytest.mark.asyncio
async def test_super_admin_can_access_all_schools(
    super_admin_client: AsyncClient, test_course: Course, school_b_course: Course
) -> None:
    """Super admin should access data from all schools."""
    # School A
    response_a = await super_admin_client.get(f"/api/v1/courses/{test_course.id}")
    assert response_a.status_code == 200

    # School B
    response_b = await super_admin_client.get(f"/api/v1/courses/{school_b_course.id}")
    assert response_b.status_code == 200
