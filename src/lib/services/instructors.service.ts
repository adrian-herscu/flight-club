import { APIError } from "../errors";
import { prisma } from "../prisma";

/**
 * Instructors Service - Works with actual Prisma schema
 * Maps to: InstructorAssignment model
 */

export async function assignInstructor(data: {
  courseId: number;
  instructorId: number;
  schoolId: number;
}) {
  // Verify course exists
  const course = await prisma.course.findUnique({
    where: { id: data.courseId },
  });

  if (!course) {
    throw new APIError("NOT_FOUND", "Course not found");
  }

  // Verify instructor exists and has INSTRUCTOR role
  const instructor = await prisma.user.findUnique({
    where: { id: data.instructorId },
  });

  if (!instructor) {
    throw new APIError("NOT_FOUND", "Instructor not found");
  }

  const hasInstructorRole = await prisma.userRole.findFirst({
    where: {
      userId: data.instructorId,
      schoolId: data.schoolId,
      roleType: "INSTRUCTOR",
    },
  });

  if (!hasInstructorRole) {
    throw new APIError("FORBIDDEN", "User does not have INSTRUCTOR role in this school");
  }

  // Check if already assigned
  const existing = await prisma.instructorAssignment.findFirst({
    where: {
      courseId: data.courseId,
      instructorId: data.instructorId,
    },
  });

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

  if (!assignment) {
    throw new APIError("NOT_FOUND", "Assignment not found");
  }

  return assignment;
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
  const assignment = await getAssignmentById(id);

  // Cannot remove if course is in progress
  const course = await prisma.course.findUnique({
    where: { id: assignment.courseId },
  });

  if (course && course.status === "in_progress") {
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
  // Calculate end time for the new assignment
  const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

  // Find all instructor assignments for this instructor
  const assignments = await prisma.instructorAssignment.findMany({
    where: {
      instructorId,
      // Include both course-level (NULL) and lesson-specific assignments
      OR: [{ courseLessonId: { not: null } }, { courseLessonId: null }],
    },
    include: {
      course: {
        select: {
          id: true,
          name: true,
          schoolId: true,
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
    // For course-level assignments, check all lessons in the course
    if (assignment.courseLessonId === null) {
      const courseLessons = await prisma.courseLesson.findMany({
        where: {
          courseId: assignment.courseId,
          startTime: { not: null },
          status: { notIn: ["cancelled"] },
          ...(excludeCourseLessonId && { id: { not: excludeCourseLessonId } }),
        },
      });

      for (const lesson of courseLessons) {
        if (!lesson.startTime || !lesson.location) continue;

        // Check location match (case-insensitive)
        if (lesson.location.toLowerCase() !== location.toLowerCase()) continue;

        const lessonEndTime = new Date(
          lesson.startTime.getTime() + lesson.durationHours * 60 * 60 * 1000,
        );

        // Check for overlap: [start1, end1) overlaps [start2, end2)
        // if start1 < end2 AND start2 < end1
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
    } else {
      // For lesson-specific assignments, check the specific lesson
      const lesson = assignment.courseLesson;

      if (!lesson) continue;
      if (excludeCourseLessonId && lesson.id === excludeCourseLessonId) continue;
      if (!lesson.startTime || !lesson.location) continue;
      if (lesson.status === "cancelled") continue;

      // Check location match (case-insensitive)
      if (lesson.location.toLowerCase() !== location.toLowerCase()) continue;

      const lessonEndTime = new Date(
        lesson.startTime.getTime() + lesson.durationHours * 60 * 60 * 1000,
      );

      // Check for overlap
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
