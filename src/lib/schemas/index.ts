import { z } from "zod";

// Syllabus schemas
export const createSyllabusSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
});

export const updateSyllabusSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

// Course schemas
export const createCourseSchema = z.object({
  schoolId: z.number().int().positive(),
  syllabusId: z.number().int().positive(),
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  maxStudents: z.number().int().positive(),
  startDate: z
    .string()
    .datetime()
    .transform((s) => new Date(s)),
  endDate: z
    .string()
    .datetime()
    .transform((s) => new Date(s)),
});

export const updateCourseSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
  maxStudents: z.number().int().positive().optional(),
  startDate: z
    .string()
    .datetime()
    .transform((s) => new Date(s))
    .optional(),
  endDate: z
    .string()
    .datetime()
    .transform((s) => new Date(s))
    .optional(),
});

// Enrollment schemas
export const createEnrollmentSchema = z.object({
  courseId: z.number().int().positive(),
  studentId: z.number().int().positive(),
  schoolId: z.number().int().positive(),
});

export const updateEnrollmentSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"]),
});

// Evaluation schemas (matching service expectations)
export const createEvaluationSchema = z.object({
  studentId: z.number().int().positive(),
  courseLessonId: z.number().int().positive(),
  enrollmentId: z.number().int().positive(),
  result: z.enum(["pass", "fail", "not_attempted"]),
  feedbackNotes: z.string().optional(),
  schoolId: z.number().int().positive(),
});

export const updateEvaluationSchema = z.object({
  result: z.enum(["pass", "fail", "not_attempted"]).optional(),
  feedbackNotes: z.string().optional(),
  adminNotes: z.string().optional(),
});
