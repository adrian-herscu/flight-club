import { NextRequest, NextResponse } from 'next/server';
import * as schoolsService from '@/lib/services/schools.service';
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

    // GET /schools/:schoolId/members - List school members
    await requireAdmin(user, schoolId);
    const members = await schoolsService.getSchoolMembers(schoolId);
    return NextResponse.json(successResponse(members, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
