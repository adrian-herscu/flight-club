import { NextRequest } from "next/server";
import * as evaluationsService from "@/lib/services/evaluations.service";
import { createApiRoute } from "@/lib/api-handler";
import { createEvaluationSchema } from "@/lib/schemas";

export const POST = createApiRoute(async (request) => {
  const data = createEvaluationSchema.parse(await request.json());
  const evaluation = await evaluationsService.recordEvaluation(data);
  return { data: evaluation, status: 201 };
});
