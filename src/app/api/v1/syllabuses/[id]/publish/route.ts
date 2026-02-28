import { NextRequest, NextResponse } from "next/server";
import * as syllabusesService from "@/lib/services/syllabuses.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { requireSuperAdmin } from "@/lib/middleware/rbac";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // POST /syllabuses/:id/publish - Publish syllabus (super-admin only)
    await requireSuperAdmin(user);
    const syllabus = await syllabusesService.publishSyllabus(parseInt(context.params.id));
    return NextResponse.json(successResponse(syllabus, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
