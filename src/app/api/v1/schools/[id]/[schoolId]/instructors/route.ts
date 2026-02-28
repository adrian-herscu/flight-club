import { NextRequest, NextResponse } from 'next/server';
import * as instructorsService from '@/lib/services/instructors.service';
import { successResponse, handleError } from '@/lib/middleware/error-handler';
import { getCurrentUser } from '@/lib/middleware/auth';
import { requireAdmin } from '@/lib/middleware/rbac';
import { getOrGenerateRequestId } from '@/lib/middleware/request-id';

export async function GET(
  request: NextRequest,
  context: { params: { schoolId: string } }
) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get('authorization') || '');
    const schoolId = parseInt(context.params.schoolId);

    // GET /schools/:schoolId/instructors - List school instructors
    await requireAdmin(user, schoolId);
    const includeAssignments = request.nextUrl.searchParams.get('includeAssignments') === 'true';
    const instructors = await instructorsService.getSchoolInstructors(
      schoolId,
      includeAssignments
    );
    return NextResponse.json(successResponse(instructors, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
