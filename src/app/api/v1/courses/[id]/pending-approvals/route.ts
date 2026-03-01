import { NextRequest } from "next/server";
import * as enrollmentsService from "@/lib/services/enrollments.service";
import { createApiRoute } from "@/lib/api-handler";

export const GET = createApiRoute(async (request, user, context) => {
  const pending = await enrollmentsService.getPendingApprovalsForCourse(
    parseInt(context.params.id),
  );
  return { data: pending, status: 200 };
});
