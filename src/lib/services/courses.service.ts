import { CourseStatus } from "@prisma/client";
import { APIError } from "../errors";
import { prisma } from "../prisma";

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
  if (data.startDate >= data.endDate) {
    throw new APIError("INVALID_DATE", "Course end date must be after start date");
  }

  const syllabus = await prisma.syllabus.findUnique({
    where: { id: data.syllabusId },
    select: { status: true },
  });

  if (!syllabus) {
    throw new APIError("NOT_FOUND", "Syllabus not found");
  }

  if (syllabus.status !== "FINAL") {
    throw new APIError("CONFLICT", "Can only create courses from published (FINAL) syllabuses");
  }

  try {
    return await prisma.course.create({
      data: {
        schoolId: data.schoolId,
        syllabusId: data.syllabusId,
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        maxStudents: data.maxStudents,
        status: CourseStatus.pending,
      },
      include: {
        school: { select: { id: true, name: true } },
        syllabus: true,
        lessons: {
          orderBy: { sequenceOrder: "asc" },
        },
      },
    });
  } catch (error: any) {
    if (error.code === "P2003") {
      throw new APIError("NOT_FOUND", "School not found");
    }
    throw error;
  }
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

  if (!course) {
    throw new APIError("NOT_FOUND", "Course not found");
  }

  return course;
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
  if (data.startDate || data.endDate) {
    const course = await prisma.course.findUnique({
      where: { id },
      select: { startDate: true, endDate: true },
    });

    if (!course) {
      throw new APIError("NOT_FOUND", "Course not found");
    }

    const startDate = data.startDate || course.startDate;
    const endDate = data.endDate || course.endDate;
    if (startDate >= endDate) {
      throw new APIError("INVALID_DATE", "Course end date must be after start date");
    }
  }

  return prisma.course.update({
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
