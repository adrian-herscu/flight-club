import { PrismaClient, EvaluationResult } from "@prisma/client";
import { APIError } from "../errors";

const prisma = new PrismaClient();

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
  // Verify student and lesson exist
  const student = await prisma.user.findUnique({
    where: { id: data.studentId },
  });

  if (!student) {
    throw new APIError("NOT_FOUND", "Student not found");
  }

  const courseLesson = await prisma.courseLesson.findUnique({
    where: { id: data.courseLessonId },
    include: { course: true },
  });

  if (!courseLesson) {
    throw new APIError("NOT_FOUND", "Course lesson not found");
  }

  // Verify enrollment exists
  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id: data.enrollmentId },
  });

  if (!enrollment || enrollment.studentId !== data.studentId) {
    throw new APIError("NOT_FOUND", "Enrollment not found");
  }

  // Check if evaluation already exists
  const existing = await prisma.studentLessonEvaluation.findFirst({
    where: {
      studentId: data.studentId,
      courseLessonId: data.courseLessonId,
    },
  });

  if (existing) {
    // Update existing evaluation
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

  return prisma.studentLessonEvaluation.create({
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

  if (!evaluation) {
    throw new APIError("NOT_FOUND", "Evaluation not found");
  }

  return evaluation;
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
  // Get all course lessons
  const courseLessons = await prisma.courseLesson.findMany({
    where: { courseId },
    orderBy: { sequenceOrder: "asc" },
  });

  if (studentId) {
    // Get progress for specific student
    const evaluations = await prisma.studentLessonEvaluation.findMany({
      where: {
        studentId,
        courseLesson: { courseId },
      },
    });

    const progress = courseLessons.map((cl) => {
      const evaluation = evaluations.find((e) => e.courseLessonId === cl.id);

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

  // Get aggregate progress for all students in course
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      courseId,
      status: "enrolled",
    },
  });

  const studentProgress: any[] = await Promise.all(
    enrollments.map((e) => getCourseProgress(courseId, e.studentId)),
  );

  const totalStudents = enrollments.length;
  const avgCompletion: number =
    totalStudents > 0
      ? Math.round(
          studentProgress.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) /
            totalStudents,
        )
      : 0;

  return {
    courseId,
    totalLessons: courseLessons.length,
    totalEnrolledStudents: totalStudents,
    averageCompletion: avgCompletion,
    studentProgress: studentProgress.map((p) => ({
      studentId: p.studentId,
      completionPercentage: p.completionPercentage,
      passed: p.passed,
      failed: p.failed,
    })),
  };
}

export async function passStudent(evaluationId: number) {
  const evaluation = await getEvaluationById(evaluationId);

  return prisma.studentLessonEvaluation.update({
    where: { id: evaluationId },
    data: {
      result: EvaluationResult.pass,
    },
    include: {
      student: { select: { id: true, email: true, name: true } },
    },
  });
}

export async function failStudent(evaluationId: number, adminNotes?: string) {
  const evaluation = await getEvaluationById(evaluationId);

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
  const evaluation = await getEvaluationById(evaluationId);

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
  const evaluation = await getEvaluationById(id);

  return prisma.studentLessonEvaluation.delete({
    where: { id },
  });
}
