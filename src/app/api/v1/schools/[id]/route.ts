import { NextRequest } from "next/server";
import * as schoolsService from "@/lib/services/schools.service";
import { requireSuperAdmin, requireAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";
import { z } from "zod";

const updateSchoolSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

export const GET = createApiRoute(async (request, user, context) => {
  const schoolId = parseInt(context.params.id);
  const school = await schoolsService.getSchoolById(schoolId);
  return { data: school, status: 200 };
});

export const PATCH = createApiRoute(async (request, user, context) => {
  const schoolId = parseInt(context.params.id);
  await requireAdmin(user, schoolId);
  const data = updateSchoolSchema.parse(await request.json());
  const school = await schoolsService.updateSchool(schoolId, data);
  return { data: school, status: 200 };
});

export const DELETE = createApiRoute(async (request, user, context) => {
  const schoolId = parseInt(context.params.id);
  await requireSuperAdmin(user);
  await schoolsService.deleteSchool(schoolId);
  return { data: null, status: 204 };
});
