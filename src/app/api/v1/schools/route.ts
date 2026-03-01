import { NextRequest } from "next/server";
import * as schoolsService from "@/lib/services/schools.service";
import { requireSuperAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";
import { z } from "zod";

const createSchoolSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

export const GET = createApiRoute(async (request, user) => {
  await requireSuperAdmin(user);
  const schools = await schoolsService.getAllSchools();
  return { data: schools, status: 200 };
});

export const POST = createApiRoute(async (request, user) => {
  await requireSuperAdmin(user);
  const data = createSchoolSchema.parse(await request.json());
  const school = await schoolsService.createSchool(data);
  return { data: school, status: 201 };
});
