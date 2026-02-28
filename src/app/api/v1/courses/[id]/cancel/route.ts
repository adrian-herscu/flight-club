import { NextRequest, NextResponse } from "next/server";
import * as coursesService from "@/lib/services/courses.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { requireAdmin } from "@/lib/middleware/rbac";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // POST /courses/:id/cancel - Cancel course (admin only)
    const course = await coursesService.getCourseById(parseInt(context.params.id));
    await requireAdmin(user, course.schoolId);
    const updated = await coursesService.cancelCourse(parseInt(context.params.id));
    return NextResponse.json(successResponse(updated, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
