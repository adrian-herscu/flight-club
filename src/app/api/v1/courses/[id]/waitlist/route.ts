import { NextRequest } from "next/server";
import * as enrollmentsService from "@/lib/services/enrollments.service";
import { createApiRoute } from "@/lib/api-handler";

export const GET = createApiRoute(async (request, user, context) => {
  const waitlist = await enrollmentsService.getCourseWaitlist(parseInt(context.params.id));
  return { data: waitlist, status: 200 };
});
