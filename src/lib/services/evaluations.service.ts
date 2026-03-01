import { EvaluationResult } from "@prisma/client";
import { APIError } from "../errors";
import { prisma } from "../prisma";
import { requireNotNull } from "../require-not-null";

/**
 * Evaluations Service - Works with actual Prisma schema
 * Maps to: StudentLessonEvaluation model
 */

export async function recordEvaluation(data: {
  studentId: number;
  courseLessonId: number;
  result: EvaluationResult;
  enrollmentId: number;
  feedbackNotes?: string;
  schoolId: number;
}) {
  // Verify enrollment and get student/lesson validation in one query
  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id: data.enrollmentId },
    select: { studentId: true },
  });

  if (!enrollment || enrollment.studentId !== data.studentId) {
    throw new APIError("NOT_FOUND", "Enrollment not found or doesn't match student");
  }

  // Check if evaluation already exists
  const existing = await prisma.studentLessonEvaluation.findFirst({
    where: {
      studentId: data.studentId,
      courseLessonId: data.courseLessonId,
    },
  });

  if (existing) {
    return prisma.studentLessonEvaluation.update({
      where: { id: existing.id },
      data: {
        result: data.result,
        feedbackNotes: data.feedbackNotes,
      },
      include: {
        student: { select: { id: true, email: true, name: true } },
        courseLesson: {
          select: {
            id: true,
            title: true,
            sequenceOrder: true,
          },
        },
      },
    });
  }

  return await prisma.studentLessonEvaluation.create({
    data: {
      studentId: data.studentId,
      enrollmentId: data.enrollmentId,
      courseLessonId: data.courseLessonId,
      schoolId: data.schoolId,
      result: data.result,
      feedbackNotes: data.feedbackNotes,
    },
    include: {
      student: { select: { id: true, email: true, name: true } },
      courseLesson: {
        select: {
          id: true,
          title: true,
          sequenceOrder: true,
        },
      },
    },
  });
}

export async function getEvaluationById(id: number) {
  const evaluation = await prisma.studentLessonEvaluation.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, email: true, name: true } },
      courseLesson: {
        include: {
          course: { select: { id: true, name: true } },
        },
      },
    },
  });

  return requireNotNull(evaluation, "Evaluation not found");
}

export async function getCourseLessonEvaluations(courseLessonId: number) {
  return prisma.studentLessonEvaluation.findMany({
    where: { courseLessonId },
    include: {
      student: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getStudentCourseEvaluations(studentId: number, courseId: number) {
  return prisma.studentLessonEvaluation.findMany({
    where: {
      studentId,
      courseLesson: {
        courseId,
      },
    },
    include: {
      courseLesson: {
        select: {
          id: true,
          title: true,
          sequenceOrder: true,
        },
      },
    },
    orderBy: { courseLesson: { sequenceOrder: "asc" } },
  });
}

export async function getStudentEvaluations(studentId: number) {
  return prisma.studentLessonEvaluation.findMany({
    where: { studentId },
    include: {
      courseLesson: {
        include: {
          course: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCourseProgress(courseId: number, studentId?: number): Promise<any> {
  if (studentId) {
    // Get lessons with evaluations in one query
    const courseLessons = await prisma.courseLesson.findMany({
      where: { courseId },
      orderBy: { sequenceOrder: "asc" },
      include: {
        evaluations: {
          where: { studentId },
          select: {
            result: true,
            updatedAt: true,
          },
        },
      },
    });

    const progress = courseLessons.map((cl) => {
      const evaluation = cl.evaluations[0];
      return {
        courseLessonId: cl.id,
        lessonTitle: cl.title,
        lessonOrder: cl.sequenceOrder,
        evaluated: !!evaluation,
        result: evaluation?.result || null,
        evaluatedAt: evaluation?.updatedAt || null,
      };
    });

    const passedCount = progress.filter((p) => p.result === "pass").length;
    const failedCount = progress.filter((p) => p.result === "fail").length;
    const notAttemptedCount = progress.filter((p) => p.result === "not_attempted").length;

    return {
      courseId,
      studentId,
      totalLessons: progress.length,
      completedLessons: progress.filter((p) => p.evaluated).length,
      passed: passedCount,
      failed: failedCount,
      notAttempted: notAttemptedCount,
      completionPercentage:
        progress.length > 0
          ? Math.round((progress.filter((p) => p.evaluated).length / progress.length) * 100)
          : 0,
      lessons: progress,
    };
  }

  // Get all data in 2 queries instead of N+1
  const [courseLessons, enrollments, allEvaluations] = await Promise.all([
    prisma.courseLesson.findMany({
      where: { courseId },
      select: { id: true },
    }),
    prisma.studentEnrollment.findMany({
      where: {
        courseId,
        status: "enrolled",
      },
      select: { studentId: true },
    }),
    prisma.studentLessonEvaluation.findMany({
      where: {
        courseLesson: { courseId },
      },
      select: {
        studentId: true,
        result: true,
      },
    }),
  ]);

  const totalLessons = courseLessons.length;
  const studentProgress = enrollments.map((enrollment) => {
    const studentEvals = allEvaluations.filter((e) => e.studentId === enrollment.studentId);
    const completed = studentEvals.length;
    const passed = studentEvals.filter((e) => e.result === "pass").length;
    const failed = studentEvals.filter((e) => e.result === "fail").length;

    return {
      studentId: enrollment.studentId,
      completionPercentage: totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0,
      passed,
      failed,
    };
  });

  const totalStudents = enrollments.length;
  const avgCompletion =
    totalStudents > 0
      ? Math.round(
          studentProgress.reduce((sum, p) => sum + p.completionPercentage, 0) / totalStudents,
        )
      : 0;

  return {
    courseId,
    totalLessons,
    totalEnrolledStudents: totalStudents,
    averageCompletion: avgCompletion,
    studentProgress,
  };
}

export async function passStudent(evaluationId: number) {
  const updated = await prisma.studentLessonEvaluation.updateMany({
    where: { id: evaluationId },
    data: { result: EvaluationResult.pass },
  });

  if (updated.count === 0) {
    throw new APIError("NOT_FOUND", "Evaluation not found");
  }

  return prisma.studentLessonEvaluation.findUnique({
    where: { id: evaluationId },
    include: {
      student: { select: { id: true, email: true, name: true } },
    },
  })!;
}

export async function failStudent(evaluationId: number, adminNotes?: string) {
  const evaluationRaw = await prisma.studentLessonEvaluation.findUnique({
    where: { id: evaluationId },
    select: { adminNotes: true },
  });

  const evaluation = requireNotNull(evaluationRaw, "Evaluation not found");

  return prisma.studentLessonEvaluation.update({
    where: { id: evaluationId },
    data: {
      result: EvaluationResult.fail,
      adminNotes: adminNotes || evaluation.adminNotes,
    },
    include: {
      student: { select: { id: true, email: true, name: true } },
    },
  });
}

export async function markNotAttempted(evaluationId: number, adminNotes?: string) {
  const evaluationRaw = await prisma.studentLessonEvaluation.findUnique({
    where: { id: evaluationId },
    select: { adminNotes: true },
  });

  const evaluation = requireNotNull(evaluationRaw, "Evaluation not found");

  return prisma.studentLessonEvaluation.update({
    where: { id: evaluationId },
    data: {
      result: EvaluationResult.not_attempted,
      adminNotes: adminNotes || evaluation.adminNotes,
    },
    include: {
      student: { select: { id: true, email: true, name: true } },
    },
  });
}

export async function deleteEvaluation(id: number) {
  const deleted = await prisma.studentLessonEvaluation.deleteMany({
    where: { id },
  });

  if (deleted.count === 0) {
    throw new APIError("NOT_FOUND", "Evaluation not found");
  }

  return { id };
}
