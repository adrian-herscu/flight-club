import { NextRequest, NextResponse } from "next/server";
import * as evaluationsService from "@/lib/services/evaluations.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";

export async function GET(
  request: NextRequest,
  context: { params: { id: string; studentId: string } },
) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // GET /courses/:id/students/:studentId/evaluations - Get student's course evaluations
    const evaluations = await evaluationsService.getStudentCourseEvaluations(
      parseInt(context.params.studentId),
      parseInt(context.params.id),
    );
    return NextResponse.json(successResponse(evaluations, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
