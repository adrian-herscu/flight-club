import { NextRequest } from "next/server";
import * as evaluationsService from "@/lib/services/evaluations.service";
import { createApiRoute } from "@/lib/api-handler";

export const GET = createApiRoute(async (request, user, context) => {
  const evaluations = await evaluationsService.getStudentEvaluations(
    parseInt(context.params.studentId),
  );
  return { data: evaluations, status: 200 };
});
