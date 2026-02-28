import { NextRequest, NextResponse } from 'next/server';
import * as schoolsService from '@/lib/services/schools.service';
import { successResponse, handleError } from '@/lib/middleware/error-handler';
import { getCurrentUser } from '@/lib/middleware/auth';
import { requireAdmin } from '@/lib/middleware/rbac';
import { getOrGenerateRequestId } from '@/lib/middleware/request-id';

export async function DELETE(
  request: NextRequest,
  context: { params: { schoolId: string; userId: string } }
) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get('authorization') || '');
    const schoolId = parseInt(context.params.schoolId);
    const userId = parseInt(context.params.userId);

    // DELETE /schools/:schoolId/members/:userId - Remove member from school
    await requireAdmin(user, schoolId);
    await schoolsService.removeSchoolMember(schoolId, userId);
    return NextResponse.json(successResponse(null, requestId), { status: 204 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
