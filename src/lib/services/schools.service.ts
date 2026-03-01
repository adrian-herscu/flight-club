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
  const updated = await prisma.school.updateMany({
    where: { id },
    data,
  });

  if (updated.count === 0) {
    throw new APIError("NOT_FOUND", "School not found");
  }

  return prisma.school.findUnique({ where: { id } })!;
}

export async function deleteSchool(id: number) {
  const school = await prisma.school.findUnique({
    where: { id },
    include: {
      _count: { select: { courses: true } },
    },
  });

  if (!school) {
    throw new APIError("NOT_FOUND", "School not found");
  }

  if (school._count.courses > 0) {
    throw new APIError("CONFLICT", "Cannot delete school with existing courses");
  }

  return prisma.school.delete({
    where: { id },
  });
}

export async function getSchoolMembers(schoolId: number) {
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
  try {
    const deleted = await prisma.userRole.deleteMany({
      where: {
        userId,
        schoolId,
      },
    });

    if (deleted.count === 0) {
      throw new APIError("NOT_FOUND", "User role not found in this school");
    }

    return deleted;
  } catch (error: any) {
    if (error instanceof APIError) {
      throw error;
    }
    if (error.code === "P2004") {
      throw new APIError("CONFLICT", "Cannot remove the last admin from a school");
    }
    throw error;
  }
}
