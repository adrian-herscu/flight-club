"""
Contract test for multi-tenant isolation.

Tests that tenant data is properly isolated at the API level.
This test MUST FAIL until tenant scoping is implemented.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_admin_cannot_access_other_school_courses(
    client: AsyncClient, school_a_admin_headers: dict, school_b_course_id: int
) -> None:
    """Admin from school A should not see school B courses."""
    response = await client.get(
        f"/api/v1/courses/{school_b_course_id}",
        headers=school_a_admin_headers
    )
    
    # Should get 404 or 403, not 200
    assert response.status_code in [403, 404]


@pytest.mark.asyncio
async def test_admin_cannot_modify_other_school_data(
    client: AsyncClient, school_a_admin_headers: dict, school_b_course_id: int
) -> None:
    """Admin from school A should not modify school B courses."""
    response = await client.patch(
        f"/api/v1/courses/{school_b_course_id}",
        headers=school_a_admin_headers,
        json={"max_students": 30}
    )
    
    # Should be forbidden or not found
    assert response.status_code in [403, 404]


@pytest.mark.asyncio
async def test_student_cannot_see_other_school_courses(
    client: AsyncClient, school_a_student_headers: dict, school_b_course_id: int
) -> None:
    """Student from school A should not see school B courses."""
    response = await client.get(
        f"/api/v1/courses/{school_b_course_id}",
        headers=school_a_student_headers
    )
    
    assert response.status_code in [403, 404]


@pytest.mark.asyncio
async def test_super_admin_can_access_all_schools(
    client: AsyncClient, super_admin_auth_headers: dict, school_a_course_id: int, school_b_course_id: int
) -> None:
    """Super admin should access data from all schools."""
    # School A
    response_a = await client.get(
        f"/api/v1/courses/{school_a_course_id}",
        headers=super_admin_auth_headers
    )
    assert response_a.status_code == 200
    
    # School B
    response_b = await client.get(
        f"/api/v1/courses/{school_b_course_id}",
        headers=super_admin_auth_headers
    )
    assert response_b.status_code == 200
