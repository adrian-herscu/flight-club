import { NextRequest, NextResponse } from 'next/server';
import * as coursesService from '@/lib/services/courses.service';
import { successResponse, handleError } from '@/lib/middleware/error-handler';
import { getCurrentUser } from '@/lib/middleware/auth';
import { getOrGenerateRequestId } from '@/lib/middleware/request-id';
import { z } from 'zod';

const updateLessonStatusSchema = z.object({
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
});

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get('authorization') || '');

    // PATCH /course-lessons/:id/status - Update lesson status (instructor only)
    const data = updateLessonStatusSchema.parse(await request.json());
    const lesson = await coursesService.updateCourseLessonStatus(
      parseInt(context.params.id),
      data.status
    );
    return NextResponse.json(successResponse(lesson, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
