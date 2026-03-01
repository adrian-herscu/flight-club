import { APIError } from "./errors";

/**
 * Asserts that a value is not null/undefined and returns it.
 * Throws NOT_FOUND APIError if value is falsy.
 *
 * Usage: return requireNotNull(user, "User not found");
 */
export function requireNotNull<T>(value: T | null | undefined, message: string): T {
  if (value == null) {
    throw new APIError("NOT_FOUND", message);
  }
  return value;
}
