import { NextRequest } from "next/server";
import * as enrollmentsService from "@/lib/services/enrollments.service";
import { requireAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";

export const DELETE = createApiRoute(async (request, user, context) => {
  const enrollment = await enrollmentsService.getEnrollmentById(parseInt(context.params.id));
  const userId = user.id;

  if (enrollment.studentId === userId) {
    // Student can unenroll themselves
  } else if (enrollment.schoolId) {
    await requireAdmin(user, enrollment.schoolId);
  }

  const updated = await enrollmentsService.unenrollStudent(parseInt(context.params.id));
  return { data: updated, status: 200 };
});
