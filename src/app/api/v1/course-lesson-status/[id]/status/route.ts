import { NextRequest, NextResponse } from "next/server";
import * as coursesService from "@/lib/services/courses.service";
import { createApiRoute } from "@/lib/api-handler";
import { z } from "zod";

const updateLessonStatusSchema = z.object({
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
});

export const PATCH = createApiRoute(async (request, user, context) => {
  const data = updateLessonStatusSchema.parse(await request.json());
  const lesson = await coursesService.updateCourseLessonStatus(
    parseInt(context.params.id),
    data.status,
  );
  return { data: lesson, status: 200 };
});
