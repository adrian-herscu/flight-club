import { NextRequest, NextResponse } from "next/server";
import * as syllabusesService from "@/lib/services/syllabuses.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { requireSuperAdmin } from "@/lib/middleware/rbac";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";
import { z } from "zod";

const updateLessonSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // PATCH /lessons/:id - Update lesson
    await requireSuperAdmin(user);
    const data = updateLessonSchema.parse(await request.json());
    const lesson = await syllabusesService.updateLesson(parseInt(context.params.id), data);
    return NextResponse.json(successResponse(lesson, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // DELETE /lessons/:id - Delete lesson
    await requireSuperAdmin(user);
    await syllabusesService.deleteLesson(parseInt(context.params.id));
    return NextResponse.json(successResponse(null, requestId), { status: 204 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
