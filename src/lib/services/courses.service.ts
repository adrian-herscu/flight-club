import { CourseStatus } from "@prisma/client";
import { APIError } from "../errors";
import { prisma } from "../prisma";
import { requireNotNull } from "../require-not-null";

/**
 * Courses Service - Works with actual Prisma schema
 * Maps to: Course, CourseLesson models
 */

export async function createCourse(data: {
  schoolId: number;
  syllabusId: number;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  maxStudents: number;
}) {
  // Fetch syllabus with its lessons
  const syllabus = await prisma.syllabus.findFirst({
    where: {
      id: data.syllabusId,
      status: "FINAL",
    },
    include: {
      lessons: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!syllabus) {
    throw new APIError("CONFLICT", "Can only create courses from published (FINAL) syllabuses");
  }

  // Create course and copy all lessons from syllabus in a transaction
  return await prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        ...data,
        status: CourseStatus.pending,
      },
    });

    // Copy lessons from syllabus to course
    if (syllabus.lessons.length > 0) {
      await tx.courseLesson.createMany({
        data: syllabus.lessons.map((lesson) => ({
          courseId: course.id,
          title: lesson.title,
          description: lesson.description || "",
          sequenceOrder: lesson.order,
          status: "scheduled",
          durationHours: 2.0, // Default 2 hours, admin can adjust later
          // startTime and location will be set later by admin
        })),
      });
    }

    // Return course with full relations
    return await tx.course.findUniqueOrThrow({
      where: { id: course.id },
      include: {
        school: { select: { id: true, name: true } },
        syllabus: true,
        lessons: {
          orderBy: { sequenceOrder: "asc" },
        },
      },
    });
  });
}

export async function getCourseById(id: number) {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      school: { select: { id: true, name: true } },
      syllabus: true,
      lessons: {
        orderBy: { sequenceOrder: "asc" },
        include: {
          instructorAssignments: {
            include: {
              instructor: {
                select: { id: true, email: true, name: true },
              },
            },
          },
        },
      },
      enrollments: {
        include: {
          student: {
            select: { id: true, email: true, name: true },
          },
        },
      },
    },
  });

  return requireNotNull(course, "Course not found");
}

export async function getSchoolCourses(schoolId: number, status?: CourseStatus) {
  return prisma.course.findMany({
    where: {
      schoolId,
      ...(status && { status }),
    },
    include: {
      lessons: {
        orderBy: { sequenceOrder: "asc" },
      },
      enrollments: true,
    },
    orderBy: { startDate: "desc" },
  });
}

export async function updateCourse(
  id: number,
  data: {
    name?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    maxStudents?: number;
  },
) {
  return await prisma.course.update({
    where: { id },
    data,
    include: {
      lessons: {
        orderBy: { sequenceOrder: "asc" },
      },
    },
  });
}

export async function cancelCourse(id: number) {
  const updated = await prisma.course.updateMany({
    where: {
      id,
      status: { not: CourseStatus.cancelled },
    },
    data: { status: CourseStatus.cancelled },
  });

  if (updated.count === 0) {
    throw new APIError("CONFLICT", "Course is already cancelled or not found");
  }

  return prisma.course.findUnique({ where: { id } })!;
}

export async function getCourseLessons(courseId: number) {
  return prisma.courseLesson.findMany({
    where: { courseId },
    orderBy: { sequenceOrder: "asc" },
    include: {
      instructorAssignments: {
        include: {
          instructor: {
            select: { id: true, email: true, name: true },
          },
        },
      },
    },
  });
}

export async function updateCourseLessonStatus(courseLessonId: number, status: string) {
  const updated = await prisma.courseLesson.updateMany({
    where: { id: courseLessonId },
    data: { status: status as any },
  });

  if (updated.count === 0) {
    throw new APIError("NOT_FOUND", "Course lesson not found");
  }

  return prisma.courseLesson.findUnique({ where: { id: courseLessonId } })!;
}
