import { NextRequest, NextResponse } from "next/server";
import * as evaluationsService from "@/lib/services/evaluations.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { requireAdmin } from "@/lib/middleware/rbac";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";
import { z } from "zod";

const recordEvaluationSchema = z.object({
  studentId: z.number().int().positive(),
  courseLessonId: z.number().int().positive(),
  enrollmentId: z.number().int().positive(),
  result: z.enum(["pass", "fail", "not_attempted"]),
  feedbackNotes: z.string().optional(),
  schoolId: z.number().int().positive(),
});

const updateEvaluationSchema = z.object({
  result: z.enum(["pass", "fail", "not_attempted"]).optional(),
  feedbackNotes: z.string().optional(),
  adminNotes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // POST /evaluations - Record/create evaluation (instructor only)
    const data = recordEvaluationSchema.parse(await request.json());
    const evaluation = await evaluationsService.recordEvaluation(data);
    return NextResponse.json(successResponse(evaluation, requestId), { status: 201 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
