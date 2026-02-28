import { NextRequest, NextResponse } from "next/server";
import * as enrollmentsService from "@/lib/services/enrollments.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { requireAdmin } from "@/lib/middleware/rbac";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // POST /enrollments/:id/approve - Approve enrollment (admin only)
    const enrollment = await enrollmentsService.getEnrollmentById(parseInt(context.params.id));
    await requireAdmin(user, enrollment.schoolId);
    const updated = await enrollmentsService.approveEnrollment(parseInt(context.params.id));
    return NextResponse.json(successResponse(updated, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
