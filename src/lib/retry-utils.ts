/**
 * Retry utility - determines if an error should be retried
 * Fail-fast errors (auth, validation) are NOT retried
 * Only transient errors (network, timeouts, server errors) are retried
 */

export const RETRY_OPTIONS = {
  maxAttempts: 3,
  minTimeout: 100,
  maxTimeout: 2000,
} as const;

/**
 * Determine if an error should trigger a retry
 * Returns false for auth, validation, and client errors
 */
export function isRetryableError(error: unknown, statusCode?: number): boolean {
  // Don't retry client errors (4xx)
  if (statusCode) {
    if (statusCode === 401 || statusCode === 403) return false; // Auth errors
    if (statusCode === 400 || statusCode === 404 || statusCode === 409) return false; // Client errors
    if (statusCode >= 400 && statusCode < 500) return false; // All other 4xx
    if (statusCode >= 500) return true; // Server errors are retryable
    if (statusCode === 429) return true; // Rate limiting
    if (statusCode === 408) return true; // Request timeout
  }

  // Network/connectivity errors
  if (error instanceof TypeError) {
    const message = (error as Error).message.toLowerCase();
    if (
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("timeout")
    ) {
      return true;
    }
  }

  // Prisma connection errors
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String(error.code);
    const retryableCodes = [
      "P4001", // Database server not found
      "P4002", // Query timeout
      "P5000", // Database unreachable
      "P5001", // Database unavailable
      "P5002", // Connection pool exhausted
      "ECONNREFUSED",
      "ENOTFOUND",
      "ETIMEDOUT",
    ];
    return retryableCodes.includes(code);
  }

  return false;
}
