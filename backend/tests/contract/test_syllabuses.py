"""
Contract test for syllabus CRUD operations.

Tests the API contract for creating, reading, updating, and deleting syllabuses.
This test MUST FAIL until syllabus endpoints are implemented.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_syllabus_requires_super_admin(
    admin_client: AsyncClient
) -> None:
    """Only super-admin can create syllabuses."""
    response = await admin_client.post(
        "/api/v1/syllabuses",

        json={
            "title": "Introduction to Flight",
            "description": "Basic flight training course",
            "status": "draft",
        }
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_syllabus_as_super_admin(
    super_admin_client: AsyncClient
) -> None:
    """Super-admin can create draft syllabuses."""
    response = await admin_client.post(
        "/api/v1/syllabuses",
        headers=super_admin_auth_headers,
        json={
            "title": "Introduction to Flight",
            "description": "Basic flight training course",
            "status": "draft",
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["title"] == "Introduction to Flight"
    assert data["data"]["status"] == "draft"
    assert data["data"]["version"] == 1


@pytest.mark.asyncio
async def test_list_syllabuses_shows_only_final_to_admins(
    admin_client: AsyncClient
) -> None:
    """Admins should only see finalized syllabuses."""
    response = await admin_client.get("/api/v1/syllabuses")
    assert response.status_code == 200
    data = response.json()
    
    # All returned syllabuses should have status="final"
    for syllabus in data["data"]["items"]:
        assert syllabus["status"] == "final"


@pytest.mark.asyncio
async def test_list_syllabuses_shows_all_to_super_admin(
    super_admin_client: AsyncClient
) -> None:
    """Super-admins should see both draft and final syllabuses."""
    response = await admin_client.get("/api/v1/syllabuses")
    assert response.status_code == 200
    # Should contain syllabuses of any status


@pytest.mark.asyncio
async def test_finalize_syllabus_creates_new_version(
    super_admin_client: AsyncClient
) -> None:
    """Finalizing a syllabus should increment version and make it immutable."""
    # Create draft
    create_response = await admin_client.post(
        "/api/v1/syllabuses",
        headers=super_admin_auth_headers,
        json={"title": "Test Course", "description": "Test", "status": "draft"}
    )
    syllabus_id = create_response.json()["data"]["id"]
    
    # Finalize it
    finalize_response = await admin_client.post(
        f"/api/v1/syllabuses/{syllabus_id}/finalize",
        headers=super_admin_auth_headers
    )
    assert finalize_response.status_code == 200
    data = finalize_response.json()
    assert data["data"]["status"] == "final"
    
    # Attempt to edit finalized syllabus should fail
    edit_response = await admin_client.patch(
        f"/api/v1/syllabuses/{syllabus_id}",
        headers=super_admin_auth_headers,
        json={"title": "Modified Title"}
    )
    assert edit_response.status_code == 400


@pytest.mark.asyncio
async def test_add_lessons_to_syllabus(
    super_admin_client: AsyncClient
) -> None:
    """Can add lessons to draft syllabus in order."""
    # Create syllabus
    create_response = await admin_client.post(
        "/api/v1/syllabuses",
        headers=super_admin_auth_headers,
        json={"title": "Test Course", "description": "Test", "status": "draft"}
    )
    syllabus_id = create_response.json()["data"]["id"]
    
    # Add lesson 1
    lesson1_response = await admin_client.post(
        f"/api/v1/syllabuses/{syllabus_id}/lessons",
        headers=super_admin_auth_headers,
        json={
            "title": "Lesson 1: Basics",
            "description": "Introduction to basics",
            "order": 1,
        }
    )
    assert lesson1_response.status_code == 201
    
    # Add lesson 2
    lesson2_response = await admin_client.post(
        f"/api/v1/syllabuses/{syllabus_id}/lessons",
        headers=super_admin_auth_headers,
        json={
            "title": "Lesson 2: Advanced",
            "description": "Advanced topics",
            "order": 2,
        }
    )
    assert lesson2_response.status_code == 201
    
    # Get syllabus with lessons
    get_response = await admin_client.get(
        f"/api/v1/syllabuses/{syllabus_id}",
        headers=super_admin_auth_headers
    )
    data = get_response.json()
    assert len(data["data"]["lessons"]) == 2
    assert data["data"]["lessons"][0]["order"] == 1
    assert data["data"]["lessons"][1]["order"] == 2
