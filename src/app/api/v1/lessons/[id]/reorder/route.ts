import { NextRequest } from "next/server";
import * as syllabusesService from "@/lib/services/syllabuses.service";
import { requireSuperAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";

export const POST = createApiRoute(async (request, user, context) => {
  await requireSuperAdmin(user);
  const { newOrder } = (await request.json()) as { newOrder: number };
  const lesson = await syllabusesService.updateLessonOrder(parseInt(context.params.id), newOrder);
  return { data: lesson, status: 200 };
});
