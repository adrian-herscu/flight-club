import { getAuthToken, hasSupabaseConfig } from "./supabaseClient";
import type { ApiResponse } from "./types";

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
  // Only get Supabase token if configured, otherwise use dev token from cookie
  const token = hasSupabaseConfig
    ? await getAuthToken()
    : typeof document !== "undefined"
      ? document.cookie
          .split("; ")
          .find((c) => c.startsWith("sb-access-token="))
          ?.split("=")[1]
      : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
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

    throw new ApiError(
      errorData?.error?.code || "UNKNOWN_ERROR",
      errorData?.error?.message || "An unexpected error occurred",
      response.status,
      errorData?.error?.details,
      requestId,
    );
  }

  const data: ApiResponse<T> = await response.json();

  if (!data.success) {
    throw new ApiError(
      data.error?.code || "UNKNOWN_ERROR",
      data.error?.message || "An unexpected error occurred",
      response.status,
      data.error?.details,
      requestId,
    );
  }

  return data.data as T;
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
