import { NextRequest, NextResponse } from 'next/server';
import * as evaluationsService from '@/lib/services/evaluations.service';
import { successResponse, handleError } from '@/lib/middleware/error-handler';
import { getCurrentUser } from '@/lib/middleware/auth';
import { getOrGenerateRequestId } from '@/lib/middleware/request-id';

export async function GET(
  request: NextRequest,
  context: { params: { courseLessonId: string } }
) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get('authorization') || '');

    // GET /course-lessons/:courseLessonId/evaluations - Get lesson evaluations
    const evaluations = await evaluationsService.getCourseLessonEvaluations(
      parseInt(context.params.courseLessonId)
    );
    return NextResponse.json(successResponse(evaluations, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
