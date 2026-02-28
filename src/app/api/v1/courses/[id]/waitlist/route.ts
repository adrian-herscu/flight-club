import { NextRequest, NextResponse } from "next/server";
import * as enrollmentsService from "@/lib/services/enrollments.service";
import { successResponse, handleError } from "@/lib/middleware/error-handler";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getOrGenerateRequestId } from "@/lib/middleware/request-id";

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const requestId = getOrGenerateRequestId(request.headers);
    const user = await getCurrentUser(request.headers.get("authorization") || "");

    // GET /courses/:id/waitlist - Get waitlist
    const waitlist = await enrollmentsService.getCourseWaitlist(parseInt(context.params.id));
    return NextResponse.json(successResponse(waitlist, requestId), { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}
