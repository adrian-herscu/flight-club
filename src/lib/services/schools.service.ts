import { APIError } from "../errors";
import { prisma } from "../prisma";

/**
 * School Service - Works with actual Prisma schema
 * Maps to: School model
 */

export async function getAllSchools() {
  return prisma.school.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          userRoles: true,
          courses: true,
        },
      },
    },
  });
}

export async function getSchoolById(id: number) {
  const school = await prisma.school.findUnique({
    where: { id },
    include: {
      userRoles: {
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      },
      courses: true,
    },
  });

  if (!school) {
    throw new APIError("NOT_FOUND", "School not found");
  }

  return school;
}

export async function createSchool(data: {
  name: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}) {
  return prisma.school.create({
    data,
  });
}

export async function updateSchool(id: number, data: any) {
  const school = await getSchoolById(id); // verify exists
  return prisma.school.update({
    where: { id },
    data,
  });
}

export async function deleteSchool(id: number) {
  await getSchoolById(id); // verify exists

  // Check if school has courses
  const courseCount = await prisma.course.count({
    where: { schoolId: id },
  });

  if (courseCount > 0) {
    throw new APIError("CONFLICT", "Cannot delete school with existing courses");
  }

  return prisma.school.delete({
    where: { id },
  });
}

export async function getSchoolMembers(schoolId: number) {
  await getSchoolById(schoolId); // verify exists

  return prisma.userRole.findMany({
    where: { schoolId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: [{ roleType: "asc" }, { user: { email: "asc" } }],
  });
}

export async function removeSchoolMember(schoolId: number, userId: number) {
  await getSchoolById(schoolId); // verify exists

  // Check if user is the last admin
  const isAdmin = await prisma.userRole.findFirst({
    where: {
      userId,
      schoolId,
      roleType: "ADMIN",
    },
  });

  if (isAdmin) {
    const adminCount = await prisma.userRole.count({
      where: {
        schoolId,
        roleType: "ADMIN",
      },
    });

    if (adminCount <= 1) {
      throw new APIError("CONFLICT", "Cannot remove the last admin from a school");
    }
  }

  return prisma.userRole.deleteMany({
    where: {
      userId,
      schoolId,
    },
  });
}
