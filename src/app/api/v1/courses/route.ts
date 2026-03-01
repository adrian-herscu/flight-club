import { NextRequest } from "next/server";
import * as coursesService from "@/lib/services/courses.service";
import { requireAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";
import { createCourseSchema } from "@/lib/schemas";

export const GET = createApiRoute(async (request) => {
  const schoolId = request.nextUrl.searchParams.get("schoolId");
  if (!schoolId) {
    return { data: [], status: 200 };
  }

  const courses = await coursesService.getSchoolCourses(parseInt(schoolId));
  return { data: courses, status: 200 };
});

export const POST = createApiRoute(async (request, user) => {
  const data = createCourseSchema.parse(await request.json());
  await requireAdmin(user, data.schoolId);
  const course = await coursesService.createCourse(data);
  return { data: course, status: 201 };
});
