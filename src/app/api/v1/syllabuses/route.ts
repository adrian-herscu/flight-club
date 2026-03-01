import { NextRequest } from "next/server";
import * as syllabusesService from "@/lib/services/syllabuses.service";
import { requireSuperAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";
import { createSyllabusSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { RoleType } from "@prisma/client";

export const GET = createApiRoute(async (request, user) => {
  const schoolId = request.nextUrl.searchParams.get("schoolId");

  // If schoolId is provided, get syllabuses for that school
  if (schoolId) {
    const syllabuses = await syllabusesService.getSchoolSyllabuses(parseInt(schoolId));
    return { data: syllabuses, status: 200 };
  }

  // For authenticated users, check if they're a super-admin
  // by checking their roles
  if (user) {
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
    });

    const isSuperAdmin = userRoles.some((r) => r.roleType === RoleType.SUPER_ADMIN);

    if (isSuperAdmin) {
      const syllabuses = await syllabusesService.getAllSyllabuses();
      return { data: syllabuses, status: 200 };
    }
  }

  return { data: [], status: 200 };
});

export const POST = createApiRoute(async (request, user) => {
  await requireSuperAdmin(user);
  const data = createSyllabusSchema.parse(await request.json());
  const syllabus = await syllabusesService.createSyllabus(data);
  return { data: syllabus, status: 201 };
});
