import { NextRequest, NextResponse } from "next/server";
import * as schoolsService from "@/lib/services/schools.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { requireSuperAdmin, requireAdmin } from "@/lib/middleware/rbac";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";
import { z } from "zod";

const updateSchoolSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");
    const schoolId = parseInt(context.params.id);

    // GET /schools/:id - Get school details
    const school = await schoolsService.getSchoolById(schoolId);
    return NextResponse.json(successResponse(school, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");
    const schoolId = parseInt(context.params.id);

    // PATCH /schools/:id - Update school (admin only)
    await requireAdmin(user, schoolId);
    const data = updateSchoolSchema.parse(await request.json());
    const school = await schoolsService.updateSchool(schoolId, data);
    return NextResponse.json(successResponse(school, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");
    const schoolId = parseInt(context.params.id);

    // DELETE /schools/:id - Delete school (super-admin only)
    await requireSuperAdmin(user);
    await schoolsService.deleteSchool(schoolId);
    return NextResponse.json(successResponse(null, requestId), { status: 204 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
