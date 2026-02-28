import { NextRequest, NextResponse } from "next/server";
import * as enrollmentsService from "@/lib/services/enrollments.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";

export async function GET(request: NextRequest, context: { params: { studentId: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // GET /students/:studentId/enrollments - Get student's enrollments
    const enrollments = await enrollmentsService.getStudentEnrollments(
      parseInt(context.params.studentId),
    );
    return NextResponse.json(successResponse(enrollments, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
