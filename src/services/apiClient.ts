import { getAuthToken, hasSupabaseConfig } from "./supabaseClient";
import type { ApiResponse } from "./types";
import pRetry, { AbortError } from "p-retry";
import { isRetryableError, RETRY_OPTIONS } from "@/lib/retry-utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, unknown>,
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return pRetry(
    async () => {
      // Get token from Supabase session (automatically managed via cookies/localStorage)
      let token: string | null = null;

      // In dev mode, check for dev token first
      if (typeof document !== "undefined" && localStorage.getItem("dev-mode") === "true") {
        token = "dev-mode-local-testing-token";
      } else if (hasSupabaseConfig) {
        // Use Supabase's session which handles cookies automatically
        token = await getAuthToken();
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) || {}),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // In dev mode, add dev user info to headers
      if (typeof window !== "undefined" && localStorage.getItem("dev-mode") === "true") {
        const devUserEmail = localStorage.getItem("dev-user-email");
        const devUserName = localStorage.getItem("dev-user-name");
        const devUserRole = localStorage.getItem("dev-user-role");

        if (devUserEmail) headers["X-Dev-User-Email"] = devUserEmail;
        if (devUserName) headers["X-Dev-User-Name"] = devUserName;
        if (devUserRole) headers["X-Dev-User-Role"] = devUserRole;
      }

      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
      });

      const requestId = response.headers.get("X-Request-ID") || undefined;

      if (!response.ok) {
        let errorData: ApiResponse | null = null;
        try {
          errorData = (await response.json()) as ApiResponse;
        } catch {
          // ignore JSON parse errors and fall back to generic error below
        }

        const error = new ApiError(
          errorData?.error?.code || "UNKNOWN_ERROR",
          errorData?.error?.message || "An unexpected error occurred",
          response.status,
          errorData?.error?.details,
          requestId,
        );

        // Don't retry non-transient errors (auth, validation, client errors)
        if (!isRetryableError(error, response.status)) {
          throw new AbortError(error);
        }

        throw error;
      }

      const data: ApiResponse<T> = await response.json();

      if (!data.success) {
        throw new AbortError(
          new ApiError(
            data.error?.code || "UNKNOWN_ERROR",
            data.error?.message || "An unexpected error occurred",
            response.status,
            data.error?.details,
            requestId,
          ),
        );
      }

      return data.data as T;
    },
    {
      retries: RETRY_OPTIONS.maxAttempts - 1,
      minTimeout: RETRY_OPTIONS.minTimeout,
      maxTimeout: RETRY_OPTIONS.maxTimeout,
      onFailedAttempt: (error) => {
        if (process.env.NODE_ENV === "development") {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.debug(
            `[API Retry] Attempt ${error.attemptNumber} failed, ${error.retriesLeft} retries left`,
            { error: errorMessage },
          );
        }
      },
    },
  );
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
