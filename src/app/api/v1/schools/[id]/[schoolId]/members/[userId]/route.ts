import { NextRequest } from "next/server";
import * as schoolsService from "@/lib/services/schools.service";
import { requireAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";

export const DELETE = createApiRoute(async (request, user, context) => {
  const schoolId = parseInt(context.params.schoolId);
  const userId = parseInt(context.params.userId);
  await requireAdmin(user, schoolId);
  await schoolsService.removeSchoolMember(schoolId, userId);
  return { data: null, status: 204 };
});
