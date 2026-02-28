import { NextRequest, NextResponse } from "next/server";
import * as evaluationsService from "@/lib/services/evaluations.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { requireAdmin } from "@/lib/middleware/rbac";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";
import { z } from "zod";

const updateEvaluationSchema = z.object({
  result: z.enum(["pass", "fail", "not_attempted"]).optional(),
  feedbackNotes: z.string().optional(),
  adminNotes: z.string().optional(),
});

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // GET /evaluations/:id - Get evaluation details
    const evaluation = await evaluationsService.getEvaluationById(parseInt(context.params.id));
    return NextResponse.json(successResponse(evaluation, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // PATCH /evaluations/:id - Update evaluation (instructor only)
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

    return NextResponse.json(successResponse(updated, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // DELETE /evaluations/:id - Delete evaluation (admin only)
    const evaluation = await evaluationsService.getEvaluationById(parseInt(context.params.id));
    await requireAdmin(user, evaluation.schoolId);
    await evaluationsService.deleteEvaluation(parseInt(context.params.id));
    return NextResponse.json(successResponse(null, requestId), { status: 204 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
