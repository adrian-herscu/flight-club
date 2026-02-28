import { NextRequest, NextResponse } from "next/server";
import * as instructorsService from "@/lib/services/instructors.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { requireAdmin } from "@/lib/middleware/rbac";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";
import { z } from "zod";

const assignInstructorSchema = z.object({
  courseId: z.number().int().positive(),
  instructorId: z.number().int().positive(),
  schoolId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // POST /instructor-assignments - Assign instructor to course (admin only)
    const data = assignInstructorSchema.parse(await request.json());
    await requireAdmin(user, data.schoolId);
    const assignment = await instructorsService.assignInstructor(data);
    return NextResponse.json(successResponse(assignment, requestId), { status: 201 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
