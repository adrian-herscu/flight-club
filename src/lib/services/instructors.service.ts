import { PrismaClient } from "@prisma/client";
import { APIError } from "../errors";

const prisma = new PrismaClient();

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
