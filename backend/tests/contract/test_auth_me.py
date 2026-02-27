"""
Contract test for /api/v1/me endpoint.

Tests the API contract for user profile retrieval.
This test MUST FAIL until the /me endpoint is implemented.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_me_endpoint_requires_auth(admin_client: AsyncClient) -> None:
    """Unauthenticated request should return 401."""
    response = await admin_client.get("/api/v1/me")
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_me_endpoint_returns_user_profile(
    admin_client: AsyncClient, auth_headers: dict
) -> None:
    """Authenticated request should return user profile."""
    response = await admin_client.get("/api/v1/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "data" in data
    
    user = data["data"]
    assert "id" in user
    assert "email" in user
    assert "name" in user
    assert "roles" in user
    assert isinstance(user["roles"], list)


@pytest.mark.asyncio
async def test_me_endpoint_includes_request_id(
    admin_client: AsyncClient, auth_headers: dict
) -> None:
    """Response should include X-Request-ID header."""
    response = await admin_client.get("/api/v1/me", headers=auth_headers)
    assert "X-Request-ID" in response.headers
    
    data = response.json()
    assert "request_id" in data
    assert data["request_id"] == response.headers["X-Request-ID"]
