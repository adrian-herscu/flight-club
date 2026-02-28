// @vitest-environment node

import { describe, expect, it, vi, afterEach } from "vitest";
import { GET as healthGet } from "@/app/api/v1/health/route";
import { GET as meGet } from "@/app/api/v1/me/route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("API v1 route contracts (Node migration)", () => {
  it("GET /api/v1/health returns healthy status", async () => {
    const response = await healthGet();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      status: "healthy",
      version: "option1-nextjs-fullstack",
    });
  });

  it("GET /api/v1/me returns dev user in non-production without cookie", async () => {
    vi.stubEnv("NODE_ENV", "test");

    const request = new Request("http://localhost:3000/api/v1/me", {
      headers: {
        authorization: "Bearer test-token-123",
      },
    });
    const response = await meGet(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Request-ID")).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.request_id).toBe(response.headers.get("X-Request-ID"));
    expect(body.data).toMatchObject({
      id: 1,
      email: "dev@local.test",
      name: "Dev User",
      roles: ["school_admin"],
    });
  });

  it("GET /api/v1/me requires token in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const request = new Request("http://localhost:3000/api/v1/me");
    const response = await meGet(request);

    expect(response.status).toBe(401);
    expect(response.headers.get("X-Request-ID")).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
    expect(body.error.message).toBe("Not authenticated");
    expect(body.request_id).toBe(response.headers.get("X-Request-ID"));
  });

  it("GET /api/v1/me succeeds in production when sb-access-token cookie exists", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const request = new Request("http://localhost:3000/api/v1/me", {
      headers: {
        cookie: "sb-access-token=dev-token-123; Path=/;",
      },
    });
    const response = await meGet(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe("dev@local.test");
  });
});
