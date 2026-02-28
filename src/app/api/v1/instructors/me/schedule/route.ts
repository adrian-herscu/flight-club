import { NextRequest, NextResponse } from "next/server";
import * as instructorsService from "@/lib/services/instructors.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";

export async function GET(request: NextRequest) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // GET /instructors/me/schedule - Get current instructor's teaching schedule
    const assignments = await instructorsService.getInstructorAssignments(user.id);
    return NextResponse.json(successResponse(assignments, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
