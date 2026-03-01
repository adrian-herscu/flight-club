import { EnrollmentStatus } from "@prisma/client";
import { APIError } from "../errors";
import { prisma } from "../prisma";
import { requireNotNull } from "../require-not-null";

/**
 * Enrollments Service - Works with actual Prisma schema
 * Maps to: StudentEnrollment model
 */

export async function createEnrollment(data: {
  courseId: number;
  studentId: number;
  schoolId: number;
}) {
  // Get course with enrollment count in one query
  const courseRaw = await prisma.course.findUnique({
    where: { id: data.courseId },
    select: {
      maxStudents: true,
      _count: {
        select: {
          enrollments: {
            where: { status: EnrollmentStatus.enrolled },
          },
        },
      },
    },
  });

  const course = requireNotNull(courseRaw, "Course not found");

  const enrolledCount = course._count.enrollments;
  const status =
    enrolledCount >= course.maxStudents
      ? EnrollmentStatus.waitlist
      : EnrollmentStatus.pending_approval;

  return await prisma.studentEnrollment.create({
    data: {
      courseId: data.courseId,
      studentId: data.studentId,
      schoolId: data.schoolId,
      status,
    },
    include: {
      course: { select: { id: true, name: true } },
      student: { select: { id: true, email: true, name: true } },
    },
  });
}

export async function getEnrollmentById(id: number) {
  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id },
    include: {
      course: true,
      student: { select: { id: true, email: true, name: true } },
    },
  });

  return requireNotNull(enrollment, "Enrollment not found");
}

export async function getCourseEnrollments(courseId: number, status?: EnrollmentStatus) {
  return prisma.studentEnrollment.findMany({
    where: {
      courseId,
      ...(status && { status }),
    },
    include: {
      student: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getStudentEnrollments(studentId: number) {
  return prisma.studentEnrollment.findMany({
    where: { studentId },
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
    orderBy: { createdAt: "desc" },
  });
}

export async function approveEnrollment(id: number) {
  const enrollmentRaw = await prisma.studentEnrollment.findUnique({
    where: { id },
    include: {
      course: {
        select: {
          id: true,
          maxStudents: true,
          _count: {
            select: {
              enrollments: {
                where: { status: EnrollmentStatus.enrolled },
              },
            },
          },
        },
      },
    },
  });

  const enrollment = requireNotNull(enrollmentRaw, "Enrollment not found");

  if (enrollment.status !== EnrollmentStatus.pending_approval) {
    throw new APIError(
      "CONFLICT",
      `Can only approve pending enrollments, current status: ${enrollment.status}`,
    );
  }

  const enrolledCount = enrollment.course._count.enrollments;
  if (enrolledCount >= enrollment.course.maxStudents) {
    throw new APIError("CONFLICT", "Course is at capacity. Must promote from waitlist first.");
  }

  const updated = await prisma.studentEnrollment.update({
    where: { id },
    data: { status: EnrollmentStatus.enrolled },
    include: {
      student: { select: { id: true, email: true, name: true } },
    },
  });

  // Try to promote waitlisted students
  await promoteWaitlisted(enrollment.courseId);

  return updated;
}

export async function rejectEnrollment(id: number) {
  const updated = await prisma.studentEnrollment.updateMany({
    where: {
      id,
      status: EnrollmentStatus.pending_approval,
    },
    data: { status: EnrollmentStatus.rejected },
  });

  if (updated.count === 0) {
    throw new APIError("CONFLICT", "Can only reject pending enrollments");
  }

  return prisma.studentEnrollment.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, email: true, name: true } },
    },
  })!;
}

async function promoteWaitlisted(courseId: number) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      maxStudents: true,
      _count: {
        select: {
          enrollments: {
            where: { status: EnrollmentStatus.enrolled },
          },
        },
      },
    },
  });

  if (!course) return;

  const openSpots = course.maxStudents - course._count.enrollments;

  if (openSpots > 0) {
    const waitlisted = await prisma.studentEnrollment.findMany({
      where: {
        courseId,
        status: EnrollmentStatus.waitlist,
      },
      orderBy: { createdAt: "asc" },
      take: openSpots,
      select: { id: true },
    });

    if (waitlisted.length > 0) {
      await prisma.studentEnrollment.updateMany({
        where: { id: { in: waitlisted.map((e) => e.id) } },
        data: { status: EnrollmentStatus.pending_approval },
      });
    }
  }
}

export async function getPendingApprovalsForCourse(courseId: number) {
  return prisma.studentEnrollment.findMany({
    where: {
      courseId,
      status: EnrollmentStatus.pending_approval,
    },
    include: {
      student: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getCourseWaitlist(courseId: number) {
  return prisma.studentEnrollment.findMany({
    where: {
      courseId,
      status: EnrollmentStatus.waitlist,
    },
    include: {
      student: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function unenrollStudent(id: number) {
  const enrollment = await getEnrollmentById(id);

  return prisma.studentEnrollment.update({
    where: { id },
    data: { status: EnrollmentStatus.unenrolled },
    include: {
      student: { select: { id: true, email: true, name: true } },
    },
  });
}
