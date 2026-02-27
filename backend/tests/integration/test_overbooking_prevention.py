"""
Integration tests for overbooking prevention (T038c).

Verifies that the system prevents assigning the same instructor to overlapping lessons
at the same location.
"""

from datetime import datetime, timedelta

import pytest


@pytest.mark.asyncio
async def test_prevent_overlapping_assignment_same_location(admin_client):
    """Cannot assign same instructor to overlapping lessons at same location."""
    course_id = 1
    instructor_id = 1

    # Create first lesson: 10:00-12:00
    lesson1_data = {
        "title": "Lesson 1",
        "sequence_order": 1,
        "start_time": (datetime.utcnow() + timedelta(days=1, hours=10)).isoformat(),
        "duration_hours": 2,
        "location": "Field A",
    }
    lesson1_response = await admin_client.post(
        f"/api/v1/courses/{course_id}/lessons",
        json=lesson1_data,
    )
    lesson1_id = lesson1_response.json()["data"]["id"]

    # Assign instructor to first lesson
    assignment1_response = await admin_client.post(
        "/api/v1/instructor-assignments",
        json={"instructor_id": instructor_id, "course_lesson_id": lesson1_id},
    )
    assert assignment1_response.status_code == 201

    # Create overlapping lesson: 11:00-13:00 at same location
    lesson2_data = {
        "title": "Lesson 2",
        "sequence_order": 2,
        "start_time": (datetime.utcnow() + timedelta(days=1, hours=11)).isoformat(),
        "duration_hours": 2,
        "location": "Field A",
    }
    lesson2_response = await admin_client.post(
        f"/api/v1/courses/{course_id}/lessons",
        json=lesson2_data,
    )
    lesson2_id = lesson2_response.json()["data"]["id"]

    # Try to assign same instructor to overlapping lesson
    assignment2_response = await admin_client.post(
        "/api/v1/instructor-assignments",
        json={"instructor_id": instructor_id, "course_lesson_id": lesson2_id},
    )

    # Should fail with conflict error
    assert assignment2_response.status_code == 409
    assert "conflict" in assignment2_response.json()["error"]["code"].lower()


@pytest.mark.asyncio
async def test_allow_same_instructor_different_location(admin_client):
    """Can assign same instructor to lessons at different locations, even if overlapping."""
    course_id = 1
    instructor_id = 1

    # Create lesson at Field A: 10:00-12:00
    lesson1_data = {
        "title": "Lesson 1",
        "sequence_order": 1,
        "start_time": (datetime.utcnow() + timedelta(days=1, hours=10)).isoformat(),
        "duration_hours": 2,
        "location": "Field A",
    }
    lesson1_response = await admin_client.post(
        f"/api/v1/courses/{course_id}/lessons",
        json=lesson1_data,
    )
    lesson1_id = lesson1_response.json()["data"]["id"]

    # Assign instructor
    assignment1_response = await admin_client.post(
        "/api/v1/instructor-assignments",
        json={"instructor_id": instructor_id, "course_lesson_id": lesson1_id},
    )
    assert assignment1_response.status_code == 201

    # Create overlapping lesson at Field B (different location)
    lesson2_data = {
        "title": "Lesson 2",
        "sequence_order": 2,
        "start_time": (datetime.utcnow() + timedelta(days=1, hours=11)).isoformat(),
        "duration_hours": 2,
        "location": "Field B",
    }
    lesson2_response = await admin_client.post(
        f"/api/v1/courses/{course_id}/lessons",
        json=lesson2_data,
    )
    lesson2_id = lesson2_response.json()["data"]["id"]

    # Assignment should succeed (different location)
    assignment2_response = await admin_client.post(
        "/api/v1/instructor-assignments",
        json={"instructor_id": instructor_id, "course_lesson_id": lesson2_id},
    )
    assert assignment2_response.status_code == 201


@pytest.mark.asyncio
async def test_allow_non_overlapping_lessons_same_location(admin_client):
    """Can assign same instructor to non-overlapping lessons at same location."""
    course_id = 1
    instructor_id = 1

    # Lesson 1: 10:00-12:00
    lesson1_data = {
        "title": "Lesson 1",
        "sequence_order": 1,
        "start_time": (datetime.utcnow() + timedelta(days=1, hours=10)).isoformat(),
        "duration_hours": 2,
        "location": "Field A",
    }
    lesson1_response = await admin_client.post(
        f"/api/v1/courses/{course_id}/lessons",
        json=lesson1_data,
    )
    lesson1_id = lesson1_response.json()["data"]["id"]

    # Assign instructor
    assignment1_response = await admin_client.post(
        "/api/v1/instructor-assignments",
        json={"instructor_id": instructor_id, "course_lesson_id": lesson1_id},
    )
    assert assignment1_response.status_code == 201

    # Lesson 2: 14:00-16:00 (non-overlapping, same location)
    lesson2_data = {
        "title": "Lesson 2",
        "sequence_order": 2,
        "start_time": (datetime.utcnow() + timedelta(days=1, hours=14)).isoformat(),
        "duration_hours": 2,
        "location": "Field A",
    }
    lesson2_response = await admin_client.post(
        f"/api/v1/courses/{course_id}/lessons",
        json=lesson2_data,
    )
    lesson2_id = lesson2_response.json()["data"]["id"]

    # Assignment should succeed (non-overlapping)
    assignment2_response = await admin_client.post(
        "/api/v1/instructor-assignments",
        json={"instructor_id": instructor_id, "course_lesson_id": lesson2_id},
    )
    assert assignment2_response.status_code == 201


@pytest.mark.asyncio
async def test_conflict_detection_includes_error_details(admin_client):
    """Conflict error response includes details about the conflicting lesson."""
    course_id = 1
    instructor_id = 1

    # Create and assign first lesson
    lesson1_data = {
        "title": "First Training",
        "sequence_order": 1,
        "start_time": (datetime.utcnow() + timedelta(days=1, hours=10)).isoformat(),
        "duration_hours": 2,
        "location": "Field A",
    }
    lesson1_response = await admin_client.post(
        f"/api/v1/courses/{course_id}/lessons",
        json=lesson1_data,
    )
    lesson1_id = lesson1_response.json()["data"]["id"]

    await admin_client.post(
        "/api/v1/instructor-assignments",
        json={"instructor_id": instructor_id, "course_lesson_id": lesson1_id},
    )

    # Try overlapping assignment
    lesson2_data = {
        "title": "Conflicting Lesson",
        "sequence_order": 2,
        "start_time": (datetime.utcnow() + timedelta(days=1, hours=11)).isoformat(),
        "duration_hours": 2,
        "location": "Field A",
    }
    lesson2_response = await admin_client.post(
        f"/api/v1/courses/{course_id}/lessons",
        json=lesson2_data,
    )
    lesson2_id = lesson2_response.json()["data"]["id"]

    conflict_response = await admin_client.post(
        "/api/v1/instructor-assignments",
        json={"instructor_id": instructor_id, "course_lesson_id": lesson2_id},
    )

    assert conflict_response.status_code == 409
    error_details = conflict_response.json()["error"]["details"]

    # Should include info about the conflicting assignment
    assert "conflicting_lesson_id" in error_details or "conflicts_with" in error_details
    assert "start_time" in error_details or "time_window" in error_details


@pytest.mark.asyncio
async def test_patch_lesson_time_triggers_conflict_check(admin_client):
    """Updating lesson start_time or duration re-checks for conflicts."""
    course_id = 1
    instructor_id = 1

    # Create two non-overlapping lessons, both assigned to same instructor
    lesson1_data = {
        "title": "Morning Lesson",
        "sequence_order": 1,
        "start_time": (datetime.utcnow() + timedelta(days=1, hours=10)).isoformat(),
        "duration_hours": 2,
        "location": "Field A",
    }
    lesson1_response = await admin_client.post(
        f"/api/v1/courses/{course_id}/lessons",
        json=lesson1_data,
    )
    lesson1_id = lesson1_response.json()["data"]["id"]

    lesson2_data = {
        "title": "Afternoon Lesson",
        "sequence_order": 2,
        "start_time": (datetime.utcnow() + timedelta(days=1, hours=14)).isoformat(),
        "duration_hours": 2,
        "location": "Field A",
    }
    lesson2_response = await admin_client.post(
        f"/api/v1/courses/{course_id}/lessons",
        json=lesson2_data,
    )
    lesson2_id = lesson2_response.json()["data"]["id"]

    # Assign both to same instructor (non-overlapping)
    await admin_client.post(
        "/api/v1/instructor-assignments",
        json={"instructor_id": instructor_id, "course_lesson_id": lesson1_id},
    )
    await admin_client.post(
        "/api/v1/instructor-assignments",
        json={"instructor_id": instructor_id, "course_lesson_id": lesson2_id},
    )

    # Extend first lesson to overlap with second: 10:00-13:00
    patch_response = await admin_client.patch(
        f"/api/v1/courses/{course_id}/lessons/{lesson1_id}",
        json={"duration_hours": 3},
    )

    # Should fail due to conflict
    assert patch_response.status_code == 409
