import { NextRequest, NextResponse } from "next/server";
import * as enrollmentsService from "@/lib/services/enrollments.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { requireAdmin } from "@/lib/middleware/rbac";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";
import { z } from "zod";

const createEnrollmentSchema = z.object({
  courseId: z.number().int().positive(),
  studentId: z.number().int().positive(),
  schoolId: z.number().int().positive(),
});

export async function GET(request: NextRequest) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // GET /enrollments - List enrollments for course
    const courseId = request.nextUrl.searchParams.get("courseId");
    const status = request.nextUrl.searchParams.get("status");

    if (!courseId) {
      return NextResponse.json(successResponse([], requestId), { status: 200 });
    }

    const enrollments = await enrollmentsService.getCourseEnrollments(
      parseInt(courseId),
      status as any,
    );
    return NextResponse.json(successResponse(enrollments, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // POST /enrollments - Request enrollment
    const data = createEnrollmentSchema.parse(await request.json());
    const enrollment = await enrollmentsService.createEnrollment(data);
    return NextResponse.json(successResponse(enrollment, requestId), { status: 201 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
