import { PrismaClient, EnrollmentStatus } from "@prisma/client";
import { APIError } from "../errors";

const prisma = new PrismaClient();

/**
 * Enrollments Service - Works with actual Prisma schema
 * Maps to: StudentEnrollment model
 */

export async function createEnrollment(data: {
  courseId: number;
  studentId: number;
  schoolId: number;
}) {
  // Verify course exists
  const course = await prisma.course.findUnique({
    where: { id: data.courseId },
  });

  if (!course) {
    throw new APIError("NOT_FOUND", "Course not found");
  }

  // Verify student exists
  const student = await prisma.user.findUnique({
    where: { id: data.studentId },
  });

  if (!student) {
    throw new APIError("NOT_FOUND", "Student not found");
  }

  // Check if already enrolled
  const existing = await prisma.studentEnrollment.findFirst({
    where: {
      courseId: data.courseId,
      studentId: data.studentId,
      status: { not: EnrollmentStatus.rejected },
    },
  });

  if (existing) {
    throw new APIError(
      "CONFLICT",
      "Student is already enrolled or pending approval for this course",
    );
  }

  // Determine status: if course is full, go to waitlist
  const enrolledCount = await prisma.studentEnrollment.count({
    where: {
      courseId: data.courseId,
      status: EnrollmentStatus.enrolled,
    },
  });

  const status =
    enrolledCount >= course.maxStudents
      ? EnrollmentStatus.waitlist
      : EnrollmentStatus.pending_approval;

  return prisma.studentEnrollment.create({
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

  if (!enrollment) {
    throw new APIError("NOT_FOUND", "Enrollment not found");
  }

  return enrollment;
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
    orderBy: { course: { startDate: "desc" } },
  });
}

export async function approveEnrollment(id: number) {
  const enrollment = await getEnrollmentById(id);

  if (enrollment.status !== EnrollmentStatus.pending_approval) {
    throw new APIError(
      "CONFLICT",
      `Can only approve pending enrollments, current status: ${enrollment.status}`,
    );
  }

  // Check course capacity
  const enrolledCount = await prisma.studentEnrollment.count({
    where: {
      courseId: enrollment.courseId,
      status: EnrollmentStatus.enrolled,
    },
  });

  const course = await prisma.course.findUnique({
    where: { id: enrollment.courseId },
  });

  if (enrolledCount >= (course?.maxStudents || 0)) {
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
  const enrollment = await getEnrollmentById(id);

  if (enrollment.status !== EnrollmentStatus.pending_approval) {
    throw new APIError("CONFLICT", `Can only reject pending enrollments`);
  }

  return prisma.studentEnrollment.update({
    where: { id },
    data: { status: EnrollmentStatus.rejected },
    include: {
      student: { select: { id: true, email: true, name: true } },
    },
  });
}

async function promoteWaitlisted(courseId: number) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) return;

  const enrolledCount = await prisma.studentEnrollment.count({
    where: {
      courseId,
      status: EnrollmentStatus.enrolled,
    },
  });

  const openSpots = course.maxStudents - enrolledCount;

  if (openSpots > 0) {
    const waitlisted = await prisma.studentEnrollment.findMany({
      where: {
        courseId,
        status: EnrollmentStatus.waitlist,
      },
      orderBy: { createdAt: "asc" },
      take: openSpots,
    });

    for (const enrollment of waitlisted) {
      await prisma.studentEnrollment.update({
        where: { id: enrollment.id },
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
