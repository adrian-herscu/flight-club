import { RoleType } from "@prisma/client";
import { APIError } from "../errors";
import { prisma } from "../prisma";
import { requireNotNull } from "../require-not-null";

/**
 * Roles Service - Works with actual Prisma schema
 * Maps to: UserRole model, RoleType enum
 */

export async function assignRole(data: {
  userId: number;
  schoolId: number;
  roleType: "SUPER_ADMIN" | "ADMIN" | "INSTRUCTOR" | "STUDENT";
}) {
  return await prisma.userRole.create({
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

  return requireNotNull(role, "Role assignment not found");
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
  return await prisma.userRole.delete({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });
}

export async function updateUserRole(id: number, newRoleType: "ADMIN" | "INSTRUCTOR" | "STUDENT") {
  return await prisma.userRole.update({
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
