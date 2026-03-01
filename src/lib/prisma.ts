import { PrismaClient } from "@prisma/client";
import pRetry, { AbortError } from "p-retry";
import { APIError } from "./errors";
import { isRetryableError, RETRY_OPTIONS } from "./retry-utils";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Middleware to map database errors to APIError
prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (error: any) {
    // Map Prisma/PostgreSQL error codes to APIError
    if (error.code === "P2002") {
      // Unique constraint violation
      const field = error.meta?.target?.[0];
      if (field === "order") {
        throw new APIError("CONFLICT", `Resource order already exists in this group`);
      }
      throw new APIError("CONFLICT", `Resource with this ${field || "value"} already exists`);
    }

    if (error.code === "P2003") {
      // Foreign key violation
      throw new APIError("NOT_FOUND", `Related entity not found`);
    }

    if (error.code === "P2004") {
      // Check constraint or trigger violation
      const message = error.meta?.database_error_code;
      throw new APIError("CONFLICT", message || "Operation violates database constraint");
    }

    if (error.code === "P2025") {
      // Record not found
      throw new APIError("NOT_FOUND", `Record not found`);
    }

    // Re-throw if already an APIError or unknown error
    throw error;
  }
});

// Add retry middleware for transient database errors
prisma.$use(async (params, next) => {
  return pRetry(
    async () => {
      try {
        return await next(params);
      } catch (error) {
        // Don't retry if not a transient error
        if (!isRetryableError(error)) {
          throw new AbortError(error as Error);
        }
        throw error;
      }
    },
    {
      retries: RETRY_OPTIONS.maxAttempts - 1,
      minTimeout: RETRY_OPTIONS.minTimeout,
      maxTimeout: RETRY_OPTIONS.maxTimeout,
      onFailedAttempt: (error) => {
        if (process.env.NODE_ENV === "development") {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.debug(
            `[Database Retry] ${params.model}.${params.action} - Attempt ${error.attemptNumber} failed, ${error.retriesLeft} retries left`,
            { error: errorMessage },
          );
        }
      },
    },
  );
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
