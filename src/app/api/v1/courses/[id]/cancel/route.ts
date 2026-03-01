import { NextRequest } from "next/server";
import * as coursesService from "@/lib/services/courses.service";
import { requireAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";

export const POST = createApiRoute(async (request, user, context) => {
  const course = await coursesService.getCourseById(parseInt(context.params.id));
  await requireAdmin(user, course.schoolId);
  const updated = await coursesService.cancelCourse(parseInt(context.params.id));
  return { data: updated, status: 200 };
});
