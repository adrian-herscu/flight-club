import { NextRequest } from "next/server";
import * as enrollmentsService from "@/lib/services/enrollments.service";
import { createApiRoute } from "@/lib/api-handler";
import { createEnrollmentSchema } from "@/lib/schemas";

export const GET = createApiRoute(async (request) => {
  const courseId = request.nextUrl.searchParams.get("courseId");
  const status = request.nextUrl.searchParams.get("status");

  if (!courseId) {
    return { data: [], status: 200 };
  }

  const enrollments = await enrollmentsService.getCourseEnrollments(
    parseInt(courseId),
    status as any,
  );
  return { data: enrollments, status: 200 };
});

export const POST = createApiRoute(async (request) => {
  const data = createEnrollmentSchema.parse(await request.json());
  const enrollment = await enrollmentsService.createEnrollment(data);
  return { data: enrollment, status: 201 };
});
