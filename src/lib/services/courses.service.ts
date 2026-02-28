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
  // Verify school exists
  const school = await prisma.school.findUnique({
    where: { id: data.schoolId },
  });
  if (!school) {
    throw new APIError("NOT_FOUND", "School not found");
  }

  // Verify syllabus exists and is FINAL
  const syllabus = await prisma.syllabus.findUnique({
    where: { id: data.syllabusId },
    include: { lessons: true },
  });

  if (!syllabus) {
    throw new APIError("NOT_FOUND", "Syllabus not found");
  }

  if (syllabus.status !== "FINAL") {
    throw new APIError("CONFLICT", "Can only create courses from published (FINAL) syllabuses");
  }

  if (data.startDate >= data.endDate) {
    throw new APIError("INVALID_DATE", "Course end date must be after start date");
  }

  return prisma.course.create({
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
  const course = await getCourseById(id);

  if (data.startDate || data.endDate) {
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
  const course = await getCourseById(id);

  if (course.status === CourseStatus.cancelled) {
    throw new APIError("CONFLICT", "Course is already cancelled");
  }

  return prisma.course.update({
    where: { id },
    data: { status: CourseStatus.cancelled },
  });
}

export async function getCourseLessons(courseId: number) {
  const course = await getCourseById(courseId);
  return course.lessons;
}

export async function updateCourseLessonStatus(courseLessonId: number, status: string) {
  const lesson = await prisma.courseLesson.findUnique({
    where: { id: courseLessonId },
  });

  if (!lesson) {
    throw new APIError("NOT_FOUND", "Course lesson not found");
  }

  return prisma.courseLesson.update({
    where: { id: courseLessonId },
    data: { status: status as any },
  });
}
