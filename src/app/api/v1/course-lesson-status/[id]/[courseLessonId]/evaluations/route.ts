import { NextRequest } from "next/server";
import * as evaluationsService from "@/lib/services/evaluations.service";
import { createApiRoute } from "@/lib/api-handler";

export const GET = createApiRoute(async (request, user, context) => {
  const evaluations = await evaluationsService.getCourseLessonEvaluations(
    parseInt(context.params.courseLessonId),
  );
  return { data: evaluations, status: 200 };
});
