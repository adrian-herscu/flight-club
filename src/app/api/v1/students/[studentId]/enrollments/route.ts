import { NextRequest } from "next/server";
import * as enrollmentsService from "@/lib/services/enrollments.service";
import { createApiRoute } from "@/lib/api-handler";

export const GET = createApiRoute(async (request, user, context) => {
  const enrollments = await enrollmentsService.getStudentEnrollments(
    parseInt(context.params.studentId),
  );
  return { data: enrollments, status: 200 };
});
