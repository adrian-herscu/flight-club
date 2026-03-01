import { NextRequest } from "next/server";
import * as instructorsService from "@/lib/services/instructors.service";
import { createApiRoute } from "@/lib/api-handler";

export const GET = createApiRoute(async (request, user, context) => {
  const assignments = await instructorsService.getInstructorAssignments(
    parseInt(context.params.instructorId),
  );
  return { data: assignments, status: 200 };
});
