"""
Contract test for role-based access control.

Tests that role gating is properly enforced at the API level.
This test MUST FAIL until RBAC is implemented.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_student_cannot_access_admin_endpoints(
    student_client: AsyncClient,
) -> None:
    """Student should get 403 when accessing admin endpoints."""
    # Try to access admin-only endpoint (syllabuses management)
    response = await student_client.get("/api/v1/syllabuses")
    assert response.status_code == 403

    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_instructor_cannot_access_admin_endpoints(
    instructor_client: AsyncClient,
) -> None:
    """Instructor should get 403 when accessing admin endpoints."""
    response = await instructor_client.get("/api/v1/syllabuses")
    assert response.status_code == 403

    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_admin_can_access_admin_endpoints(admin_client: AsyncClient) -> None:
    """Admin should access admin endpoints successfully."""
    response = await admin_client.get("/api/v1/syllabuses")
    # Should not be 403, but might be 200 or other status depending on implementation
    assert response.status_code != 403


@pytest.mark.asyncio
async def test_super_admin_can_access_all_endpoints(
    super_admin_client: AsyncClient,
) -> None:
    """Super admin should access all endpoints successfully."""
    response = await admin_client.get("/api/v1/syllabuses")
    assert response.status_code != 403
