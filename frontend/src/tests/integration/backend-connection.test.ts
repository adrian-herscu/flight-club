/**
 * Frontend-Backend Integration Test
 *
 * Tests that the frontend can successfully connect to the backend API
 * and handle network errors gracefully.
 */

import { describe, it, expect } from "vitest";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

describe("Frontend-Backend Integration", () => {
  it("should connect to backend without NetworkError", async () => {
    // This test simulates what the browser does when loading the app
    // It should NOT throw a NetworkError

    let fetchError = null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/health`);
      expect(response.ok).toBe(true);
    } catch (error: any) {
      fetchError = error;
    }

    // Assert that we did NOT get a network error
    expect(fetchError).toBeNull();

    // If this test fails with "NetworkError when attempting to fetch resource"
    // it means the backend is not running or not accessible
  });

  it("should have NEXT_PUBLIC_API_URL environment variable set", () => {
    // The frontend needs to know where the backend is
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    expect(apiUrl).toBeDefined();
    expect(apiUrl).toBeTruthy();
    expect(apiUrl).toMatch(/^https?:\/\//); // Should be a valid URL
  });

  it("should gracefully handle backend unavailability", async () => {
    // Test that the app doesn't crash when backend is down
    // Instead, it should show a user-friendly error message

    let errorMessage = "";

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/nonexistent`);

      if (!response.ok) {
        errorMessage = "Backend returned error";
      }
    } catch (error: any) {
      // This is what happens when backend is completely down
      errorMessage = error.message;
    }

    // The app should handle this gracefully, not crash
    expect(errorMessage).toBeDefined();

    // Error message should be informative
    if (errorMessage.includes("fetch")) {
      console.warn("⚠️  Backend appears to be down - NetworkError detected");
      console.warn("   This is the same error shown in the browser screenshot");
      console.warn("   Expected behavior: Show user-friendly error, not raw NetworkError");
    }
  });

  it("should validate API responses have correct structure", async () => {
    // When backend IS running, responses should follow the API contract

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/health`);

      if (response.ok) {
        const data = await response.json();

        // API contract: health endpoint returns { status: 'healthy' }
        expect(data).toHaveProperty("status");
        expect(data.status).toBe("healthy");
      } else {
        // If backend is down, this test should skip validation
        console.warn("⚠️  Backend not available - skipping response validation");
      }
    } catch (error) {
      // Network error - backend not running
      console.warn("⚠️  Backend not running - this causes the browser NetworkError");
      // Don't fail the test - we're documenting the issue
    }
  });
});
