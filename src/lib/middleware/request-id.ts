import { randomUUID } from "node:crypto";

/**
 * Get or generate a request ID
 * Uses X-Request-ID header if provided, otherwise generates a new UUID
 * For use in Next.js API routes
 * @param headers Request headers object
 * @returns Request ID string
 */
export function getOrGenerateRequestId(headers: Headers | Record<string, string>): string {
  // Handle both Headers object and plain object
  let requestId: string | null = null;

  if (headers instanceof Headers) {
    requestId = headers.get("x-request-id");
  } else {
    requestId = headers["x-request-id"] as string;
  }

  return requestId || randomUUID();
}
