import { z } from "zod";

/**
 * T061 [US5] Conflict response schema
 *
 * Describes a scheduling conflict when an instructor assignment overlaps with existing lessons
 */

/**
 * Schema for a single lesson conflict
 */
export const LessonConflictSchema = z.object({
  courseLessonId: z.number().int().positive(),
  lessonTitle: z.string(),
  courseId: z.number().int().positive(),
  courseName: z.string(),
  location: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  durationHours: z.number().positive(),
});

export type LessonConflict = z.infer<typeof LessonConflictSchema>;

/**
 * Schema for the full conflict response
 */
export const InstructorConflictResponseSchema = z.object({
  hasConflicts: z.boolean(),
  conflictCount: z.number().int().nonnegative(),
  conflicts: z.array(LessonConflictSchema),
  message: z.string().optional(),
});

export type InstructorConflictResponse = z.infer<typeof InstructorConflictResponseSchema>;

/**
 * Helper function to create a conflict response
 */
export function createConflictResponse(conflicts: LessonConflict[]): InstructorConflictResponse {
  const hasConflicts = conflicts.length > 0;
  const message = hasConflicts
    ? `Instructor has ${conflicts.length} scheduling conflict${conflicts.length > 1 ? "s" : ""}`
    : undefined;

  return {
    hasConflicts,
    conflictCount: conflicts.length,
    conflicts,
    message,
  };
}
