import { NextRequest } from "next/server";
import * as enrollmentsService from "@/lib/services/enrollments.service";
import { requireAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";

export const POST = createApiRoute(async (request, user, context) => {
  const enrollment = await enrollmentsService.getEnrollmentById(parseInt(context.params.id));
  await requireAdmin(user, enrollment.schoolId);
  const updated = await enrollmentsService.approveEnrollment(parseInt(context.params.id));
  return { data: updated, status: 200 };
});
