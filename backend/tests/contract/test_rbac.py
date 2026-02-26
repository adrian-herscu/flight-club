"""
Contract test for role-based access control.

Tests that role gating is properly enforced at the API level.
This test MUST FAIL until RBAC is implemented.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_student_cannot_access_admin_endpoints(
    client: AsyncClient, student_auth_headers: dict
) -> None:
    """Student should get 403 when accessing admin endpoints."""
    # Try to access admin-only endpoint (syllabuses management)
    response = await client.get("/api/v1/syllabuses", headers=student_auth_headers)
    assert response.status_code == 403
    
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_instructor_cannot_access_admin_endpoints(
    client: AsyncClient, instructor_auth_headers: dict
) -> None:
    """Instructor should get 403 when accessing admin endpoints."""
    response = await client.get("/api/v1/syllabuses", headers=instructor_auth_headers)
    assert response.status_code == 403
    
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_admin_can_access_admin_endpoints(
    client: AsyncClient, admin_auth_headers: dict
) -> None:
    """Admin should access admin endpoints successfully."""
    response = await client.get("/api/v1/syllabuses", headers=admin_auth_headers)
    # Should not be 403, but might be 200 or other status depending on implementation
    assert response.status_code != 403


@pytest.mark.asyncio
async def test_super_admin_can_access_all_endpoints(
    client: AsyncClient, super_admin_auth_headers: dict
) -> None:
    """Super admin should access all endpoints successfully."""
    response = await client.get("/api/v1/syllabuses", headers=super_admin_auth_headers)
    assert response.status_code != 403
