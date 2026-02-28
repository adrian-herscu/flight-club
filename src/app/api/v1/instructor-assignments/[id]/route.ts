import { NextRequest, NextResponse } from "next/server";
import * as instructorsService from "@/lib/services/instructors.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { requireAdmin } from "@/lib/middleware/rbac";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // DELETE /instructor-assignments/:id - Remove instructor assignment (admin only)
    const assignment = await instructorsService.getAssignmentById(parseInt(context.params.id));
    await requireAdmin(user, assignment.schoolId);
    await instructorsService.removeInstructorAssignment(parseInt(context.params.id));
    return NextResponse.json(successResponse(null, requestId), { status: 204 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
