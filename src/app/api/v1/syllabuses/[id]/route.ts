import { NextRequest } from "next/server";
import * as syllabusesService from "@/lib/services/syllabuses.service";
import { requireSuperAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";
import { updateSyllabusSchema } from "@/lib/schemas";

export const GET = createApiRoute(async (request, user, context) => {
  const syllabus = await syllabusesService.getSyllabusById(parseInt(context.params.id));
  return { data: syllabus, status: 200 };
});

export const PATCH = createApiRoute(async (request, user, context) => {
  await requireSuperAdmin(user);
  const data = updateSyllabusSchema.parse(await request.json());
  const syllabus = await syllabusesService.updateSyllabus(parseInt(context.params.id), data);
  return { data: syllabus, status: 200 };
});

export const DELETE = createApiRoute(async (request, user, context) => {
  await requireSuperAdmin(user);
  await syllabusesService.deleteSyllabus(parseInt(context.params.id));
  return { data: null, status: 204 };
});
