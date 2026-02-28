import { NextRequest, NextResponse } from "next/server";
import * as syllabusesService from "@/lib/services/syllabuses.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { requireSuperAdmin } from "@/lib/middleware/rbac";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";
import { z } from "zod";

const updateSyllabusSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // GET /syllabuses/:id - Get syllabus details
    const syllabus = await syllabusesService.getSyllabusById(parseInt(context.params.id));
    return NextResponse.json(successResponse(syllabus, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // PATCH /syllabuses/:id - Update syllabus (super-admin only)
    await requireSuperAdmin(user);
    const data = updateSyllabusSchema.parse(await request.json());
    const syllabus = await syllabusesService.updateSyllabus(parseInt(context.params.id), data);
    return NextResponse.json(successResponse(syllabus, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // DELETE /syllabuses/:id - Delete syllabus (super-admin only)
    await requireSuperAdmin(user);
    await syllabusesService.deleteSyllabus(parseInt(context.params.id));
    return NextResponse.json(successResponse(null, requestId), { status: 204 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
