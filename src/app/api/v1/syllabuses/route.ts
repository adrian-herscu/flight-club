import { NextRequest, NextResponse } from "next/server";
import * as syllabusesService from "@/lib/services/syllabuses.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { requireSuperAdmin } from "@/lib/middleware/rbac";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";
import { z } from "zod";

const createSyllabusSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
});

const updateSyllabusSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // GET /syllabuses - List all syllabuses
    const schoolId = request.nextUrl.searchParams.get("schoolId");
    if (!schoolId) {
      return NextResponse.json(successResponse([], requestId), { status: 200 });
    }

    const syllabuses = await syllabusesService.getSchoolSyllabuses(parseInt(schoolId));
    return NextResponse.json(successResponse(syllabuses, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // POST /syllabuses - Create new syllabus (super-admin only)
    await requireSuperAdmin(user);
    const data = createSyllabusSchema.parse(await request.json());
    const syllabus = await syllabusesService.createSyllabus(data);
    return NextResponse.json(successResponse(syllabus, requestId), { status: 201 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
