import { NextRequest, NextResponse } from "next/server";
import * as evaluationsService from "@/lib/services/evaluations.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";

export async function GET(request: NextRequest, context: { params: { studentId: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // GET /students/:studentId/evaluations - Get student's all evaluations
    const evaluations = await evaluationsService.getStudentEvaluations(
      parseInt(context.params.studentId),
    );
    return NextResponse.json(successResponse(evaluations, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
