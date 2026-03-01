import { NextRequest } from "next/server";
import * as instructorsService from "@/lib/services/instructors.service";
import { requireAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";

export const GET = createApiRoute(async (request, user, context) => {
  const schoolId = parseInt(context.params.schoolId);
  await requireAdmin(user, schoolId);
  const includeAssignments = request.nextUrl.searchParams.get("includeAssignments") === "true";
  const instructors = await instructorsService.getSchoolInstructors(schoolId, includeAssignments);
  return { data: instructors, status: 200 };
});
