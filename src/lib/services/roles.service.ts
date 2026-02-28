import { PrismaClient } from "@prisma/client";
import { APIError } from "../errors";

const prisma = new PrismaClient();

/**
 * Roles Service - Works with actual Prisma schema
 * Maps to: UserRole model, RoleType enum
 */

export async function assignRole(data: {
  userId: number;
  schoolId: number;
  roleType: "SUPER_ADMIN" | "ADMIN" | "INSTRUCTOR" | "STUDENT";
}) {
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user) {
    throw new APIError("NOT_FOUND", "User not found");
  }

  // Verify school exists if not assigning SUPER_ADMIN
  if (data.roleType !== "SUPER_ADMIN") {
    const school = await prisma.school.findUnique({
      where: { id: data.schoolId },
    });

    if (!school) {
      throw new APIError("NOT_FOUND", "School not found");
    }
  }

  // Check if role already exists
  const existing = await prisma.userRole.findFirst({
    where: {
      userId: data.userId,
      schoolId: data.schoolId,
      roleType: data.roleType,
    },
  });

  if (existing) {
    throw new APIError("CONFLICT", "User already has this role in this school");
  }

  return prisma.userRole.create({
    data: {
      userId: data.userId,
      schoolId: data.schoolId,
      roleType: data.roleType,
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
      school: { select: { id: true, name: true } },
    },
  });
}

export async function getRoleById(id: number) {
  const role = await prisma.userRole.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      school: { select: { id: true, name: true } },
    },
  });

  if (!role) {
    throw new APIError("NOT_FOUND", "Role assignment not found");
  }

  return role;
}

export async function getUserRoles(userId: number) {
  return prisma.userRole.findMany({
    where: { userId },
    include: {
      school: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSchoolRoles(schoolId: number) {
  return prisma.userRole.findMany({
    where: { schoolId },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSchoolAdmins(schoolId: number) {
  return prisma.userRole.findMany({
    where: {
      schoolId,
      roleType: "ADMIN",
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });
}

export async function removeRole(id: number) {
  const role = await getRoleById(id);

  // Cannot remove last ADMIN from school
  if (role.roleType === "ADMIN") {
    const adminCount = await prisma.userRole.count({
      where: {
        schoolId: role.schoolId,
        roleType: "ADMIN",
      },
    });

    if (adminCount <= 1) {
      throw new APIError("CONFLICT", "Cannot remove the last admin from a school");
    }
  }

  return prisma.userRole.delete({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });
}

export async function updateUserRole(id: number, newRoleType: "ADMIN" | "INSTRUCTOR" | "STUDENT") {
  const role = await getRoleById(id);

  // Cannot demote last ADMIN
  if (role.roleType === "ADMIN" && newRoleType !== "ADMIN") {
    const adminCount = await prisma.userRole.count({
      where: {
        schoolId: role.schoolId,
        roleType: "ADMIN",
      },
    });

    if (adminCount <= 1) {
      throw new APIError("CONFLICT", "Cannot demote the last admin from a school");
    }
  }

  return prisma.userRole.update({
    where: { id },
    data: { roleType: newRoleType },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });
}

export async function hasRole(
  userId: number,
  roleType: string,
  schoolId?: number,
): Promise<boolean> {
  const role = await prisma.userRole.findFirst({
    where: {
      userId,
      roleType: roleType as any,
      ...(schoolId && { schoolId }),
    },
  });

  return !!role;
}

export async function hasAnyRole(
  userId: number,
  roleTypes: string[],
  schoolId?: number,
): Promise<boolean> {
  const role = await prisma.userRole.findFirst({
    where: {
      userId,
      roleType: { in: roleTypes as any[] },
      ...(schoolId && { schoolId }),
    },
  });

  return !!role;
}

export async function canManageSchool(userId: number, schoolId: number): Promise<boolean> {
  return hasAnyRole(userId, ["SUPER_ADMIN", "ADMIN"], schoolId);
}

export async function isSuperAdmin(userId: number): Promise<boolean> {
  const role = await prisma.userRole.findFirst({
    where: {
      userId,
      roleType: "SUPER_ADMIN",
    },
  });

  return !!role;
}

export async function getSchoolInstructorCount(schoolId: number) {
  return prisma.userRole.count({
    where: {
      schoolId,
      roleType: "INSTRUCTOR",
    },
  });
}

export async function getSchoolStudentCount(schoolId: number) {
  return prisma.userRole.count({
    where: {
      schoolId,
      roleType: "STUDENT",
    },
  });
}
