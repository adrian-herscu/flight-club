import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

/**
 * Custom API Error class
 * Represents application-level errors with HTTP status codes
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * Handle errors and return standardized error response object
 * For use in Next.js API route try-catch blocks
 * @param error Any error object
 * @param requestId Optional request ID for tracking
 * @returns Error response object with status code and body
 */
export function handleError(error: any, requestId?: string): { status: number; body: object } {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: error.errors,
        },
        request_id: requestId,
      },
    };
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return {
        status: 409,
        body: {
          success: false,
          data: null,
          error: {
            code: "CONFLICT",
            message: "Resource already exists",
            details: error.meta,
          },
          request_id: requestId,
        },
      };
    }

    if (error.code === "P2025") {
      return {
        status: 404,
        body: {
          success: false,
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "Resource not found",
          },
          request_id: requestId,
        },
      };
    }

    // Generic Prisma error
    return {
      status: 500,
      body: {
        success: false,
        data: null,
        error: {
          code: "DATABASE_ERROR",
          message: "Database error occurred",
          details: error.meta,
        },
        request_id: requestId,
      },
    };
  }

  // Handle custom API errors
  if (error instanceof APIError) {
    return {
      status: error.statusCode,
      body: {
        success: false,
        data: null,
        error: {
          code: error.name,
          message: error.message,
          details: error.details,
        },
        request_id: requestId,
      },
    };
  }

  // Handle generic errors
  const statusCode = error?.statusCode || 500;
  const message = error?.message || "Internal server error";

  return {
    status: statusCode,
    body: {
      success: false,
      data: null,
      error: {
        code: error?.name || "INTERNAL_ERROR",
        message,
      },
      request_id: requestId,
    },
  };
}

/**
 * Create a standardized success response object
 * @param data Response data
 * @param requestId Request ID for tracking
 * @returns Success response object
 */
export function successResponse<T>(data: T, requestId?: string) {
  return {
    success: true,
    data,
    error: null,
    request_id: requestId,
  };
}
