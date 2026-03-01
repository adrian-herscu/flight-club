import { NextRequest } from "next/server";
import * as syllabusesService from "@/lib/services/syllabuses.service";
import { requireSuperAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";
import { createSyllabusSchema } from "@/lib/schemas";

export const GET = createApiRoute(async (request) => {
  const schoolId = request.nextUrl.searchParams.get("schoolId");
  if (!schoolId) {
    return { data: [], status: 200 };
  }

  const syllabuses = await syllabusesService.getSchoolSyllabuses(parseInt(schoolId));
  return { data: syllabuses, status: 200 };
});

export const POST = createApiRoute(async (request, user) => {
  await requireSuperAdmin(user);
  const data = createSyllabusSchema.parse(await request.json());
  const syllabus = await syllabusesService.createSyllabus(data);
  return { data: syllabus, status: 201 };
});
