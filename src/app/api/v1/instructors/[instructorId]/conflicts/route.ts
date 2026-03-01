import { NextRequest } from "next/server";
import * as instructorsService from "@/lib/services/instructors.service";
import { createApiRoute } from "@/lib/api-handler";
import { z } from "zod";

const conflictsQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const GET = createApiRoute(async (request, user, context) => {
  const query = conflictsQuerySchema.parse({
    startDate: request.nextUrl.searchParams.get("startDate"),
    endDate: request.nextUrl.searchParams.get("endDate"),
  });

  const conflicts = await instructorsService.getInstructorScheduleConflicts(
    parseInt(context.params.instructorId),
    new Date(query.startDate),
    new Date(query.endDate),
  );
  return { data: conflicts, status: 200 };
});
