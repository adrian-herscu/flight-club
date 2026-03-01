import * as syllabusesService from "@/lib/services/syllabuses.service";
import { requireSuperAdmin } from "@/lib/middleware/rbac";
import { createApiRoute } from "@/lib/api-handler";

/**
 * POST /api/v1/syllabuses/:id/create-version
 * Create a new Draft version from a FINAL syllabus
 */
export const POST = createApiRoute(async (request, user, context) => {
  await requireSuperAdmin(user);
  const newDraft = await syllabusesService.createDraftFromFinal(parseInt(context.params.id));
  return { data: newDraft, status: 201 };
});
