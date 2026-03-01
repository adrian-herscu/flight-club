import { NextRequest } from "next/server";
import * as syllabusesService from "@/lib/services/syllabuses.service";
import { requireSuperAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";
import { z } from "zod";

const updateLessonSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

export const PATCH = createApiRoute(async (request, user, context) => {
  await requireSuperAdmin(user);
  const data = updateLessonSchema.parse(await request.json());
  const lesson = await syllabusesService.updateLesson(parseInt(context.params.id), data);
  return { data: lesson, status: 200 };
});

export const DELETE = createApiRoute(async (request, user, context) => {
  await requireSuperAdmin(user);
  await syllabusesService.deleteLesson(parseInt(context.params.id));
  return { data: null, status: 204 };
});
