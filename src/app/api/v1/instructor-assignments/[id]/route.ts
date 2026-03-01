import { NextRequest } from "next/server";
import * as instructorsService from "@/lib/services/instructors.service";
import { requireAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";

export const DELETE = createApiRoute(async (request, user, context) => {
  const assignment = await instructorsService.getAssignmentById(parseInt(context.params.id));
  await requireAdmin(user, assignment.schoolId);
  await instructorsService.removeInstructorAssignment(parseInt(context.params.id));
  return { data: null, status: 204 };
});
