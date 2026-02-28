import { NextRequest, NextResponse } from "next/server";
import * as coursesService from "@/lib/services/courses.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { requireAdmin } from "@/lib/middleware/rbac";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";
import { z } from "zod";

const updateCourseSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
  maxStudents: z.number().int().positive().optional(),
  startDate: z
    .string()
    .datetime()
    .transform((s) => new Date(s))
    .optional(),
  endDate: z
    .string()
    .datetime()
    .transform((s) => new Date(s))
    .optional(),
});

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // GET /courses/:id - Get course details
    const course = await coursesService.getCourseById(parseInt(context.params.id));
    return NextResponse.json(successResponse(course, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // PATCH /courses/:id - Update course (admin only)
    const course = await coursesService.getCourseById(parseInt(context.params.id));
    await requireAdmin(user, course.schoolId);
    const data = updateCourseSchema.parse(await request.json());
    const updated = await coursesService.updateCourse(parseInt(context.params.id), data);
    return NextResponse.json(successResponse(updated, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
