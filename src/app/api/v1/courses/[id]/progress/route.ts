import { NextRequest, NextResponse } from "next/server";
import * as evaluationsService from "@/lib/services/evaluations.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // GET /courses/:id/progress - Get course progress (aggregate or individual)
    const studentId = request.nextUrl.searchParams.get("studentId");
    const progress = await evaluationsService.getCourseProgress(
      parseInt(context.params.id),
      studentId ? parseInt(studentId) : undefined,
    );
    return NextResponse.json(successResponse(progress, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
