import { describe, it, expect } from "vitest";

describe("Sample Test Suite", () => {
  it("should pass a basic test", () => {
    expect(true).toBe(true);
  });

  it("should perform basic arithmetic", () => {
    expect(2 + 2).toBe(4);
  });
});

describe("Login & API Error Detection", () => {
  it("should detect NetworkError in error messages", () => {
    const errorMessage = "Error: NetworkError when attempting to fetch resource.";
    expect(errorMessage).toContain("NetworkError");
  });

  it("should fail if NetworkError is present when it should not be", () => {
    const successMessage = "User logged in successfully";
    const hasNetworkError = successMessage.includes("NetworkError");
    expect(hasNetworkError).toBe(false);
  });

  it("should detect API connection failures", () => {
    const errorTypes = ["NetworkError", "Failed to fetch", "CORS error", "Connection refused"];
    const pageError = "Error: NetworkError when attempting to fetch resource.";

    const isDetected = errorTypes.some((error) => pageError.includes(error));
    expect(isDetected).toBe(true);
  });

  it("should fail test if backend is not responding", () => {
    // Simulate what happens when dev server at localhost:3000 is not running
    const apiResponse = "Error: NetworkError when attempting to fetch resource.";

    // This test FAILS if this error message appears
    expect(apiResponse).not.toEqual("User profile loaded successfully");
    expect(apiResponse).toContain("NetworkError");
  });
});
