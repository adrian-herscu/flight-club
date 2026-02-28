import { NextRequest, NextResponse } from "next/server";
import * as instructorsService from "@/lib/services/instructors.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";

export async function GET(request: NextRequest, context: { params: { instructorId: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // GET /instructors/:instructorId/conflicts - Check schedule conflicts
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "startDate and endDate required",
          },
          request_id: requestId,
        },
        { status: 400 },
      );
    }

    const conflicts = await instructorsService.getInstructorScheduleConflicts(
      parseInt(context.params.instructorId),
      new Date(startDate),
      new Date(endDate),
    );
    return NextResponse.json(successResponse(conflicts, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
