import { NextRequest } from "next/server";
import * as syllabusesService from "@/lib/services/syllabuses.service";
import { requireSuperAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";

export const POST = createApiRoute(async (request, user, context) => {
  await requireSuperAdmin(user);
  const syllabus = await syllabusesService.publishSyllabus(parseInt(context.params.id));
  return { data: syllabus, status: 200 };
});
