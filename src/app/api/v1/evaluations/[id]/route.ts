import { NextRequest } from "next/server";
import * as evaluationsService from "@/lib/services/evaluations.service";
import { requireAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";
import { z } from "zod";

const updateEvaluationSchema = z.object({
  result: z.enum(["pass", "fail", "not_attempted"]).optional(),
  feedbackNotes: z.string().optional(),
  adminNotes: z.string().optional(),
});

export const GET = createApiRoute(async (request, user, context) => {
  const evaluation = await evaluationsService.getEvaluationById(parseInt(context.params.id));
  return { data: evaluation, status: 200 };
});

export const PATCH = createApiRoute(async (request, user, context) => {
  const evaluation = await evaluationsService.getEvaluationById(parseInt(context.params.id));
  await requireAdmin(user, evaluation.schoolId);
  const data = updateEvaluationSchema.parse(await request.json());

  let updated;
  if (data.result) {
    switch (data.result) {
      case "pass":
        updated = await evaluationsService.passStudent(parseInt(context.params.id));
        break;
      case "fail":
        updated = await evaluationsService.failStudent(
          parseInt(context.params.id),
          data.adminNotes,
        );
        break;
      case "not_attempted":
        updated = await evaluationsService.markNotAttempted(
          parseInt(context.params.id),
          data.adminNotes,
        );
        break;
    }
  } else {
    updated = evaluation;
  }

  return { data: updated, status: 200 };
});

export const DELETE = createApiRoute(async (request, user, context) => {
  const evaluation = await evaluationsService.getEvaluationById(parseInt(context.params.id));
  await requireAdmin(user, evaluation.schoolId);
  await evaluationsService.deleteEvaluation(parseInt(context.params.id));
  return { data: null, status: 204 };
});
