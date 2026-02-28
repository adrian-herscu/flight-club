import { NextRequest, NextResponse } from "next/server";
import * as instructorsService from "@/lib/services/instructors.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // GET /courses/:id/instructors - Get course instructors
    const instructors = await instructorsService.getCourseInstructors(parseInt(context.params.id));
    return NextResponse.json(successResponse(instructors, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
