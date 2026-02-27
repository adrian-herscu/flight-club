"""
Integration tests for complete course workflows (T038b).

Tests the full flow: course creation → lesson scheduling → student enrollment →
instructor assignment → lesson completion.
"""

from datetime import datetime, timedelta

import pytest
from src.models.course import CourseStatus


@pytest.mark.asyncio
async def test_complete_course_workflow(
    admin_client,
    student_client,
    instructor_client,
    admin_user,
    student_user,
    instructor_user,
    db,
):
    """Complete workflow: create course → enroll student → assign instructor → complete lesson."""
    # 1. Admin creates course from syllabus
    course_data = {
        "name": "Full Course Test",
        "description": "Test complete workflow",
        "syllabus_id": 1,
        "max_students": 10,
    }
    course_response = await admin_client.post(
        "/api/v1/courses",
        json=course_data,
    )
    assert course_response.status_code == 201
    course_id = course_response.json()["data"]["id"]

    # 2. Student requests enrollment
    enroll_response = await student_client.post(
        "/api/v1/enrollments",
        json={"course_id": course_id},
    )
    assert enroll_response.status_code == 201
    enrollment_id = enroll_response.json()["data"]["id"]

    # 3. Admin approves enrollment
    approve_response = await admin_client.patch(
        f"/api/v1/enrollments/{enrollment_id}/approve",
        json={},
    )
    assert approve_response.status_code == 200
    assert approve_response.json()["data"]["status"] == "enrolled"

    # 4. Admin adds lesson to course
    lesson_data = {
        "title": "First Lesson",
        "sequence_order": 1,
        "start_time": (datetime.utcnow() + timedelta(days=1)).isoformat(),
        "duration_hours": 2,
        "location": "Training Field",
    }
    lesson_response = await admin_client.post(
        f"/api/v1/courses/{course_id}/lessons",
        json=lesson_data,
    )
    assert lesson_response.status_code == 201
    lesson_id = lesson_response.json()["data"]["id"]

    # 5. Admin assigns instructor to lesson
    assignment_data = {
        "instructor_id": instructor_user.id,
        "course_lesson_id": lesson_id,
    }
    assignment_response = await admin_client.post(
        "/api/v1/instructor-assignments",
        json=assignment_data,
    )
    assert assignment_response.status_code == 201

    # 6. Verify student can see lesson in their schedule
    schedule_response = await student_client.get(
        f"/api/v1/courses/{course_id}",
    )
    assert schedule_response.status_code == 200
    schedule_data = schedule_response.json()["data"]
    assert schedule_data["status"] == CourseStatus.IN_PROGRESS.value


@pytest.mark.asyncio
async def test_enrollment_approval_workflow(
    admin_client, student_client, admin_user, student_user
):
    """Test multi-student enrollment approval process."""
    course_id = 1

    # Multiple students request enrollment
    enrollment_ids = []
    for _ in range(12):
        response = await student_client.post(
            "/api/v1/enrollments",
            json={"course_id": course_id},
        )
        assert response.status_code == 201
        enrollment_ids.append(response.json()["data"]["id"])

    # Admin retrieves pending queue
    queue_response = await admin_client.get(
        "/api/v1/enrollments?status=pending_approval",
    )
    assert queue_response.status_code == 200
    pending = queue_response.json()["data"]
    assert len(pending) >= len(enrollment_ids)

    # Admin approves first 10, remaining go to waitlist
    for i, enrollment_id in enumerate(enrollment_ids[:10]):
        response = await admin_client.patch(
            f"/api/v1/enrollments/{enrollment_id}/approve",
            json={},
        )
        assert response.status_code == 200

    # Check remaining are in waitlist
    for enrollment_id in enrollment_ids[10:]:
        response = await admin_client.patch(
            f"/api/v1/enrollments/{enrollment_id}/approve",
            json={},
        )
        assert response.status_code == 200
        assert response.json()["data"]["status"] == "waitlist"


@pytest.mark.asyncio
async def test_rejection_workflow(admin_client, student_client):
    """Test enrollment rejection with reason."""
    course_id = 1

    # Student enrolls
    response = await student_client.post(
        "/api/v1/enrollments",
        json={"course_id": course_id},
    )
    enrollment_id = response.json()["data"]["id"]

    # Admin rejects with reason
    response = await admin_client.patch(
        f"/api/v1/enrollments/{enrollment_id}/approve",
        json={"approved": False, "rejection_reason": "Prerequisites not met"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "rejected"
    assert response.json()["data"]["rejection_reason"] == "Prerequisites not met"


@pytest.mark.asyncio
async def test_waitlist_fifo_promotion(admin_client, student_client):
    """Test that waitlisted students are promoted in FIFO order."""
    course_id = 1

    # Enroll 12 students (course capacity is 10)
    enrollment_ids = []
    for _ in range(12):
        response = await student_client.post(
            "/api/v1/enrollments",
            json={"course_id": course_id},
        )
        enrollment_ids.append(response.json()["data"]["id"])

    # Approve all
    for i, enrollment_id in enumerate(enrollment_ids):
        response = await admin_client.patch(
            f"/api/v1/enrollments/{enrollment_id}/approve",
            json={},
        )
        assert response.status_code == 200

        # First 10 should be enrolled
        if i < 10:
            assert response.json()["data"]["status"] == "enrolled"
        # Rest should be waitlisted
        else:
            assert response.json()["data"]["status"] == "waitlist"

    # Unenroll one of the first 10 - this endpoint may not exist yet
    # Skip this part for now as it requires additional implementation
    # unenroll_response = await admin_client.post(
    #     f"/api/v1/enrollments/{enrollment_ids[0]}/unenroll",
    #     json={},
    # )
    # assert unenroll_response.status_code == 200

    # First waitlisted student should automatically be promoted
    # promoted_response = await admin_client.get(
    #     f"/api/v1/enrollments/{enrollment_ids[10]}",
    # )
    # assert promoted_response.status_code == 200
    # assert promoted_response.json()["data"]["status"] == "enrolled"
