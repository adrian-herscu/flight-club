import { NextRequest } from "next/server";
import * as coursesService from "@/lib/services/courses.service";
import { createApiRoute } from "@/lib/api-handler";

export const GET = createApiRoute(async (request, user, context) => {
  const lessons = await coursesService.getCourseLessons(parseInt(context.params.id));
  return { data: lessons, status: 200 };
});
