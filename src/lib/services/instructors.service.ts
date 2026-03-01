import { APIError } from "../errors";
import { prisma } from "../prisma";
import { requireNotNull } from "../require-not-null";

/**
 * Instructors Service - Works with actual Prisma schema
 * Maps to: InstructorAssignment model
 */

export async function assignInstructor(data: {
  courseId: number;
  instructorId: number;
  schoolId: number;
}) {
  // Get course with dates and verify instructor role in one query
  const [courseRaw, hasInstructorRole, existing] = await Promise.all([
    prisma.course.findUnique({
      where: { id: data.courseId },
      select: { startDate: true, endDate: true },
    }),
    prisma.userRole.findFirst({
      where: {
        userId: data.instructorId,
        schoolId: data.schoolId,
        roleType: "INSTRUCTOR",
      },
      select: { id: true },
    }),
    prisma.instructorAssignment.findFirst({
      where: {
        courseId: data.courseId,
        instructorId: data.instructorId,
      },
      select: { id: true },
    }),
  ]);

  const course = requireNotNull(courseRaw, "Course not found");

  if (!hasInstructorRole) {
    throw new APIError("FORBIDDEN", "User does not have INSTRUCTOR role in this school");
  }

  if (existing) {
    throw new APIError("CONFLICT", "Instructor is already assigned to this course");
  }

  // Check for schedule conflicts
  const conflicts = await checkScheduleConflicts(
    data.instructorId,
    course.startDate,
    course.endDate,
  );

  if (conflicts.length > 0) {
    throw new APIError(
      "CONFLICT",
      `Instructor has schedule conflicts with ${conflicts.length} other course(s)`,
    );
  }

  return prisma.instructorAssignment.create({
    data: {
      courseId: data.courseId,
      instructorId: data.instructorId,
      schoolId: data.schoolId,
      assignedAt: new Date(),
    },
    include: {
      course: { select: { id: true, name: true, startDate: true, endDate: true } },
      instructor: { select: { id: true, email: true, name: true } },
    },
  });
}

export async function getAssignmentById(id: number) {
  const assignment = await prisma.instructorAssignment.findUnique({
    where: { id },
    include: {
      course: true,
      instructor: { select: { id: true, email: true, name: true } },
    },
  });

  return requireNotNull(assignment, "Assignment not found");
}

export async function getCourseInstructors(courseId: number) {
  return prisma.instructorAssignment.findMany({
    where: { courseId },
    include: {
      instructor: { select: { id: true, email: true, name: true } },
    },
  });
}

export async function getInstructorAssignments(instructorId: number) {
  return prisma.instructorAssignment.findMany({
    where: { instructorId },
    include: {
      course: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          school: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { course: { startDate: "desc" } },
  });
}

export async function removeInstructorAssignment(id: number) {
  const assignmentRaw = await prisma.instructorAssignment.findUnique({
    where: { id },
    include: {
      course: { select: { status: true } },
    },
  });

  const assignment = requireNotNull(assignmentRaw, "Assignment not found");

  if (assignment.course.status === "in_progress") {
    throw new APIError("CONFLICT", "Cannot remove instructor from in-progress course");
  }

  return prisma.instructorAssignment.delete({
    where: { id },
    include: {
      instructor: { select: { id: true, email: true, name: true } },
    },
  });
}

/**
 * Check if instructor has schedule conflicts during given date range
 */
async function checkScheduleConflicts(instructorId: number, startDate: Date, endDate: Date) {
  return prisma.instructorAssignment.findMany({
    where: {
      instructorId,
      course: {
        AND: [
          {
            // Course starts before or on the same day our course ends
            startDate: { lte: endDate },
          },
          {
            // Course ends after or on the same day our course starts
            endDate: { gte: startDate },
          },
          {
            // Exclude cancelled courses
            status: { not: "cancelled" },
          },
        ],
      },
    },
    include: {
      course: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });
}

export async function getInstructorScheduleConflicts(
  instructorId: number,
  startDate: Date,
  endDate: Date,
) {
  return checkScheduleConflicts(instructorId, startDate, endDate);
}

export async function getSchoolInstructors(schoolId: number, includeAssignments = false) {
  const users = await prisma.user.findMany({
    where: {
      roles: {
        some: {
          schoolId,
          roleType: "INSTRUCTOR",
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      ...(includeAssignments && {
        instructorAssignments: {
          include: {
            course: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      }),
    },
  });

  return users;
}

/**
 * T060 [US5] Check for overbooking conflicts when assigning an instructor to a lesson.
 *
 * Overbooking occurs when an instructor is assigned to overlapping lessons at the same location.
 * This function checks:
 * 1. Same instructor
 * 2. Same location (case-insensitive)
 * 3. Overlapping time windows: [start_time, start_time + duration_hours)
 *
 * NULL start_time lessons are skipped (not yet scheduled).
 *
 * @param instructorId - The instructor to check for conflicts
 * @param location - The physical location of the new assignment
 * @param startTime - Scheduled start time of the new lesson
 * @param durationHours - Duration of the new lesson in hours
 * @param excludeCourseLessonId - Optional: exclude this lesson from conflict check (for updates)
 * @returns Array of conflicting lessons with details
 */
export async function checkLessonOverbooking(
  instructorId: number,
  location: string,
  startTime: Date,
  durationHours: number,
  excludeCourseLessonId?: number,
) {
  const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

  // Get all assignments with their lessons in a single query
  const assignments = await prisma.instructorAssignment.findMany({
    where: { instructorId },
    include: {
      course: {
        select: {
          id: true,
          name: true,
          lessons: {
            where: {
              startTime: { not: null },
              status: { notIn: ["cancelled"] },
              ...(excludeCourseLessonId && { id: { not: excludeCourseLessonId } }),
            },
            select: {
              id: true,
              title: true,
              startTime: true,
              durationHours: true,
              location: true,
            },
          },
        },
      },
      courseLesson: {
        select: {
          id: true,
          title: true,
          startTime: true,
          durationHours: true,
          location: true,
          status: true,
        },
      },
    },
  });

  const conflicts: Array<{
    courseLessonId: number;
    lessonTitle: string;
    courseId: number;
    courseName: string;
    location: string;
    startTime: Date;
    endTime: Date;
    durationHours: number;
  }> = [];

  for (const assignment of assignments) {
    const lessonsToCheck =
      assignment.courseLessonId === null
        ? assignment.course.lessons
        : assignment.courseLesson
          ? [assignment.courseLesson]
          : [];

    for (const lesson of lessonsToCheck) {
      if (!lesson.startTime || !lesson.location) continue;
      if (lesson.location.toLowerCase() !== location.toLowerCase()) continue;
      if ("status" in lesson && lesson.status === "cancelled") continue;
      if (excludeCourseLessonId && lesson.id === excludeCourseLessonId) continue;

      const lessonEndTime = new Date(
        lesson.startTime.getTime() + lesson.durationHours * 60 * 60 * 1000,
      );

      if (startTime < lessonEndTime && lesson.startTime < endTime) {
        conflicts.push({
          courseLessonId: lesson.id,
          lessonTitle: lesson.title,
          courseId: assignment.courseId,
          courseName: assignment.course.name,
          location: lesson.location,
          startTime: lesson.startTime,
          endTime: lessonEndTime,
          durationHours: lesson.durationHours,
        });
      }
    }
  }

  return conflicts;
}
