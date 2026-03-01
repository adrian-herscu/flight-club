import { NextRequest, NextResponse } from "next/server";
import { User } from "@prisma/client";
import { getCurrentUser } from "./middleware/auth";
import { getOrGenerateRequestId } from "./middleware/request-id";
import { successResponse, handleError } from "./middleware/error-handler";

export type ApiHandler = (
  request: NextRequest,
  user: User,
  context: any,
) => Promise<{ data: any; status: number }>;

/**
 * API route wrapper that handles common boilerplate:
 * - Request ID generation
 * - Authentication
 * - Success response formatting
 * - Error handling
 *
 * Usage:
 * export const GET = createApiRoute(async (req, user, context) => ({
 *   data: await someService.getData(),
 *   status: 200
 * }));
 */
export function createApiRoute(handler: ApiHandler) {
  return async (request: NextRequest, context?: any) => {
    try {
      const requestId = getOrGenerateRequestId(request.headers);
      const user = await getCurrentUser(request.headers.get("authorization") || "");

      const { data, status } = await handler(request, user, context);

      return NextResponse.json(successResponse(data, requestId), { status });
    } catch (error) {
      const requestId = getOrGenerateRequestId(request.headers);
      const { status, body } = handleError(error, requestId);
      return NextResponse.json(body, { status });
    }
  };
}
