import { PrismaClient } from "@prisma/client";
import pRetry, { AbortError } from "p-retry";
import { isRetryableError, RETRY_OPTIONS } from "./retry-utils";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
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
