import { NextRequest, NextResponse } from 'next/server';
import * as syllabusesService from '@/lib/services/syllabuses.service';
import { successResponse, handleError } from '@/lib/middleware/error-handler';
import { getCurrentUser } from '@/lib/middleware/auth';
import { requireSuperAdmin } from '@/lib/middleware/rbac';
import { getOrGenerateRequestId } from '@/lib/middleware/request-id';
import { z } from 'zod';

const addLessonSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  order: z.number().int().positive(),
});

export async function POST(
  request: NextRequest,
  context: { params: { syllabusId: string } }
) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get('authorization') || '');

    // POST /syllabuses/:syllabusId/lessons - Add lesson
    await requireSuperAdmin(user);
    const data = addLessonSchema.parse(await request.json());
    const lesson = await syllabusesService.addLesson({
      syllabusId: parseInt(context.params.syllabusId),
      ...data,
    });
    return NextResponse.json(successResponse(lesson, requestId), { status: 201 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
