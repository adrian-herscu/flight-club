import { NextRequest } from "next/server";
import * as schoolsService from "@/lib/services/schools.service";
import { requireAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";

export const GET = createApiRoute(async (request, user, context) => {
  const schoolId = parseInt(context.params.schoolId);
  await requireAdmin(user, schoolId);
  const members = await schoolsService.getSchoolMembers(schoolId);
  return { data: members, status: 200 };
});
