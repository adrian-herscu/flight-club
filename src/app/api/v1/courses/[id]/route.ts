import { NextRequest } from "next/server";
import * as coursesService from "@/lib/services/courses.service";
import { requireAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";
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

export const GET = createApiRoute(async (request, user, context) => {
  const course = await coursesService.getCourseById(parseInt(context.params.id));
  return { data: course, status: 200 };
});

export const PATCH = createApiRoute(async (request, user, context) => {
  const course = await coursesService.getCourseById(parseInt(context.params.id));
  await requireAdmin(user, course.schoolId);
  const data = updateCourseSchema.parse(await request.json());
  const updated = await coursesService.updateCourse(parseInt(context.params.id), data);
  return { data: updated, status: 200 };
});
