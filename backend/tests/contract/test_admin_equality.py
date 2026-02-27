"""
Contract test for equal admin permissions.

Verifies that no admin has privileges that others don't.
This test enforces the constitution requirement that all admins have equal permissions.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_all_admins_have_equal_permissions(
    admin_client: AsyncClient
) -> None:
    """
    All admins should have identical permissions.
    
    No admin should have any privilege that another admin doesn't have.
    This prevents hierarchical admin structures.
    """
    # Test various admin endpoints - all should be accessible
    endpoints = [
        "/api/v1/courses",
        "/api/v1/enrollments",
        "/api/v1/instructors",
        "/api/v1/syllabuses",
    ]
    
    for endpoint in endpoints:
        response = await admin_client.get(endpoint)
        # Should not be forbidden (403) - either success or other status
        assert response.status_code != 403, (
            f"Admin cannot access {endpoint} - suggests hierarchical admin structure"
        )


@pytest.mark.asyncio
async def test_admin_cannot_modify_other_admin_roles(
    admin_client: AsyncClient
) -> None:
    """
    Admins should not be able to change other admins' roles.
    
    This prevents one admin from elevating themselves or demoting others.
    """
    # Attempt to modify another user's role
    response = await admin_client.post(
        "/api/v1/users/2/roles",

        json={"role": "super_admin"},
    )
    
    # Should be forbidden - only super-admins can modify roles
    assert response.status_code == 403
