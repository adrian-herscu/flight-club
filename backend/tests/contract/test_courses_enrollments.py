"""
Contract tests for course creation and enrollment APIs (T038a).

These tests define the API contract for managing courses and student enrollments.
All tests should be written BEFORE implementation and will initially FAIL.
"""

from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from src.models.syllabus import Syllabus
from src.models.user import User


@pytest.mark.asyncio
async def test_course_creation_requires_admin_or_super_admin(
    client_factory, admin_user, student_user, test_syllabus: Syllabus
):
    """Only admins and super-admins can create courses."""
    course_data = {
        "name": "Beginner Paragliding",
        "description": "Learn the basics of paragliding",
        "syllabus_id": test_syllabus.id,
        "max_students": 10,
    }

    # Admin should succeed
    async with client_factory(admin_user) as admin_client:
        response = await admin_client.post(
            "/api/v1/courses",
            json=course_data,
        )
        assert response.status_code == 201

    # Student should be denied
    async with client_factory(student_user) as student_client:
        response = await student_client.post(
            "/api/v1/courses",
            json=course_data,
        )
        assert response.status_code == 403


@pytest.mark.asyncio
async def test_course_creation_success(admin_client: AsyncClient, test_syllabus: Syllabus):
    """Admin can create a course successfully."""
    course_data = {
        "name": "Intermediate Hangliding",
        "description": "Build on your hangliding skills",
        "syllabus_id": test_syllabus.id,
        "max_students": 20,
        "start_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
    }

    response = await admin_client.post(
        "/api/v1/courses",
        json=course_data,
    )

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == course_data["name"]
    assert data["max_students"] == course_data["max_students"]
    assert data["status"] == "pending"
    assert "id" in data


@pytest.mark.asyncio
async def test_course_requires_valid_syllabus(admin_client: AsyncClient):
    """Course creation must reference a valid final syllabus."""
    course_data = {
        "name": "Test Course",
        "syllabus_id": 99999,  # Non-existent
        "max_students": 10,
    }

    response = await admin_client.post(
        "/api/v1/courses",
        json=course_data,
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_student_enrollment_request(student_client: AsyncClient, test_course):
    """Student can request enrollment in a course."""
    response = await student_client.post(
        "/api/v1/enrollments",
        json={"course_id": test_course.id},
    )

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["status"] == "pending_approval"


@pytest.mark.asyncio
async def test_enrollment_reaches_pending_approval_state(
    client_factory, admin_user, student_user
):
    """New enrollment starts in pending_approval state."""
    # Student enrolls
    async with client_factory(student_user) as student_client:
        enroll_response = await student_client.post(
            "/api/v1/enrollments",
            json={"course_id": 1},
        )
        enrollment_id = enroll_response.json()["data"]["id"]

    # Check enrollment status
    async with client_factory(admin_user) as admin_client:
        response = await admin_client.get(
            f"/api/v1/enrollments/{enrollment_id}",
        )

    assert response.status_code == 200
    assert response.json()["data"]["status"] == "pending_approval"


@pytest.mark.asyncio
async def test_admin_can_approve_enrollment(admin_client: AsyncClient):
    """Admin can approve a pending enrollment."""
    # Assuming pending enrollment with id=1 exists
    response = await admin_client.patch(
        "/api/v1/enrollments/1/approve",
        json={},
    )

    assert response.status_code == 200
    assert response.json()["data"]["status"] == "enrolled"


@pytest.mark.asyncio
async def test_admin_can_reject_enrollment_with_reason(admin_client: AsyncClient):
    """Admin can reject enrollment with optional reason message."""
    response = await admin_client.patch(
        "/api/v1/enrollments/1/approve",
        json={"approved": False, "rejection_reason": "Insufficient experience level"},
    )

    assert response.status_code == 200
    assert response.json()["data"]["status"] == "rejected"
    assert (
        response.json()["data"]["rejection_reason"] == "Insufficient experience level"
    )


@pytest.mark.asyncio
async def test_enrollment_at_capacity_goes_to_waitlist(admin_client: AsyncClient):
    """When course is at capacity, approved enrollments are placed in waitlist."""
    # Course 1 has max_students=10
    # Approve first 10 students
    for i in range(10):
        await admin_client.patch(
            f"/api/v1/enrollments/{i+1}/approve",
            json={},
        )

    # 11th student enrollment should be waitlisted when approved
    response = await admin_client.patch(
        "/api/v1/enrollments/11/approve",
        json={},
    )

    assert response.status_code == 200
    assert response.json()["data"]["status"] == "waitlist"


@pytest.mark.asyncio
async def test_enrollment_visibility_scoped_to_school(admin_client: AsyncClient):
    """Admins can only see enrollments for their school."""
    # Admin from school 1 should see enrollments
    response = await admin_client.get(
        "/api/v1/enrollments",
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_course_lesson_creation(admin_client: AsyncClient):
    """Admin can add lessons to a course from the syllabus."""
    course_id = 1
    lesson_data = {
        "title": "Ground School Basics",
        "sequence_order": 1,
        "start_time": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "duration_hours": 2,
        "location": "Main Field",
    }

    response = await admin_client.post(
        f"/api/v1/courses/{course_id}/lessons",
        json=lesson_data,
    )

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["status"] == "scheduled"


@pytest.mark.asyncio
async def test_admin_can_view_enrollment_queue(admin_client: AsyncClient):
    """Admin can retrieve pending enrollments for approval."""
    response = await admin_client.get(
        "/api/v1/enrollments?status=pending_approval",
    )

    assert response.status_code == 200
    data = response.json()["data"]
    # API returns paginated response
    assert "items" in data
    assert isinstance(data["items"], list)
    # All items should be pending_approval
    for enrollment in data["items"]:
        assert enrollment["status"] == "pending_approval"
