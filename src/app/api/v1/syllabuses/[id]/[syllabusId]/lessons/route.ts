import { NextRequest } from "next/server";
import * as syllabusesService from "@/lib/services/syllabuses.service";
import { requireSuperAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";
import { z } from "zod";

const addLessonSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  order: z.number().int().positive(),
});

export const POST = createApiRoute(async (request, user, context) => {
  await requireSuperAdmin(user);
  const data = addLessonSchema.parse(await request.json());
  const lesson = await syllabusesService.addLesson({
    syllabusId: parseInt(context.params.syllabusId),
    ...data,
  });
  return { data: lesson, status: 201 };
});
