import { NextRequest, NextResponse } from "next/server";
import * as coursesService from "@/lib/services/courses.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { requireAdmin } from "@/lib/middleware/rbac";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";
import { z } from "zod";

const createCourseSchema = z.object({
  schoolId: z.number().int().positive(),
  syllabusId: z.number().int().positive(),
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  maxStudents: z.number().int().positive(),
  startDate: z
    .string()
    .datetime()
    .transform((s) => new Date(s)),
  endDate: z
    .string()
    .datetime()
    .transform((s) => new Date(s)),
});

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

export async function GET(request: NextRequest) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // GET /courses - List school courses
    const schoolId = request.nextUrl.searchParams.get("schoolId");
    if (!schoolId) {
      return NextResponse.json(successResponse([], requestId), { status: 200 });
    }

    const courses = await coursesService.getSchoolCourses(parseInt(schoolId));
    return NextResponse.json(successResponse(courses, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // POST /courses - Create course (admin only)
    const data = createCourseSchema.parse(await request.json());
    await requireAdmin(user, data.schoolId);
    const course = await coursesService.createCourse(data);
    return NextResponse.json(successResponse(course, requestId), { status: 201 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
