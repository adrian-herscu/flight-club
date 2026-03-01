import { NextRequest } from "next/server";
import * as evaluationsService from "@/lib/services/evaluations.service";
import { createApiRoute } from "@/lib/api-handler";

export const GET = createApiRoute(async (request, user, context) => {
  const studentId = request.nextUrl.searchParams.get("studentId");
  const progress = await evaluationsService.getCourseProgress(
    parseInt(context.params.id),
    studentId ? parseInt(studentId) : undefined,
  );
  return { data: progress, status: 200 };
});
