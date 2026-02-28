import { NextRequest, NextResponse } from "next/server";
import * as schoolsService from "@/lib/services/schools.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { requireSuperAdmin } from "@/lib/middleware/rbac";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";
import { z } from "zod";

const createSchoolSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // GET /schools - List all schools (super-admin only)
    await requireSuperAdmin(user);
    const schools = await schoolsService.getAllSchools();
    return NextResponse.json(successResponse(schools, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // POST /schools - Create new school (super-admin only)
    await requireSuperAdmin(user);
    const data = createSchoolSchema.parse(await request.json());
    const school = await schoolsService.createSchool(data);
    return NextResponse.json(successResponse(school, requestId), { status: 201 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
