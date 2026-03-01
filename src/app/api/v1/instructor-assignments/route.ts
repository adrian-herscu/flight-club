import { NextRequest } from "next/server";
import * as instructorsService from "@/lib/services/instructors.service";
import { requireAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";
import { z } from "zod";

const assignInstructorSchema = z.object({
  courseId: z.number().int().positive(),
  instructorId: z.number().int().positive(),
  schoolId: z.number().int().positive(),
});

export const POST = createApiRoute(async (request, user) => {
  const data = assignInstructorSchema.parse(await request.json());
  await requireAdmin(user, data.schoolId);
  const assignment = await instructorsService.assignInstructor(data);
  return { data: assignment, status: 201 };
});
