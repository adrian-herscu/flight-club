import { NextRequest } from "next/server";
import * as instructorsService from "@/lib/services/instructors.service";
import { createApiRoute } from "@/lib/api-handler";

export const GET = createApiRoute(async (request, user, context) => {
  const instructors = await instructorsService.getCourseInstructors(parseInt(context.params.id));
  return { data: instructors, status: 200 };
});
