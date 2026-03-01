import { PrismaClient, RoleType, User } from "@prisma/client";
import { APIError } from "../errors";

const prisma = new PrismaClient();

/**
 * Check if user has a specific role
 * @param userId User ID
 * @param roleType Role type to check
 * @param schoolId Optional school ID for school-specific roles
 * @returns True if user has the role
 */
export async function hasRole(
  userId: number,
  roleType: RoleType,
  schoolId?: number | null,
): Promise<boolean> {
  const role = await prisma.userRole.findFirst({
    where: {
      userId,
      roleType,
      ...(schoolId !== undefined ? { schoolId } : {}),
    },
  });

  return !!role;
}

/**
 * Get all roles for a user
 * @param userId User ID
 * @param schoolId Optional school ID to filter by
 * @returns Array of user roles
 */
export async function getUserRoles(userId: number, schoolId?: number) {
  return await prisma.userRole.findMany({
    where: {
      userId,
      ...(schoolId ? { schoolId } : {}),
    },
    include: {
      school: true,
    },
  });
}

/**
 * Require specific role for Next.js API route
 * Throws APIError if user doesn't have the role
 * @param user User object
 * @param requiredRole Required role type
 * @param schoolId Optional school ID for school-specific roles
 */
export async function requireRole(
  user: User | null,
  requiredRole: RoleType,
  schoolId?: number | null,
): Promise<void> {
  if (!user) {
    throw new APIError(401, "Not authenticated");
  }

  // Check for super-admin first (can access everything)
  const isSuperAdmin = await hasRole(user.id, RoleType.SUPER_ADMIN, null);
  if (isSuperAdmin) {
    return;
  }

  // Check for required role
  const hasRequiredRole = await hasRole(user.id, requiredRole, schoolId);

  if (!hasRequiredRole) {
    throw new APIError(403, `User does not have required role: ${requiredRole}`);
  }
}

/**
 * Require super-admin role
 * Throws APIError if user is not a super-admin
 * @param user User object
 */
export async function requireSuperAdmin(user: User | null): Promise<void> {
  if (!user) {
    throw new APIError(401, "Not authenticated");
  }

  const isSuperAdmin = await hasRole(user.id, RoleType.SUPER_ADMIN, null);
  if (!isSuperAdmin) {
    throw new APIError(403, "Super-admin access required");
  }
}

/**
 * Require admin role
 * Super-admin can also access. Throws APIError if user doesn't have required access.
 * @param user User object
 * @param schoolId Optional school ID for school-specific admin role
 */
export async function requireAdmin(user: User | null, schoolId?: number | null): Promise<void> {
  if (!user) {
    throw new APIError(401, "Not authenticated");
  }

  // Super-admin can access everything
  const isSuperAdmin = await hasRole(user.id, RoleType.SUPER_ADMIN, null);
  if (isSuperAdmin) {
    return;
  }

  // Check admin role for specific school
  const isAdmin = await hasRole(user.id, RoleType.ADMIN, schoolId);
  if (!isAdmin) {
    throw new APIError(403, "Admin access required");
  }
}

/**
 * Require instructor role
 * Super-admin and admin can also access. Throws APIError if user doesn't have required access.
 * @param user User object
 * @param schoolId Optional school ID for school-specific instructor role
 */
export async function requireInstructor(
  user: User | null,
  schoolId?: number | null,
): Promise<void> {
  if (!user) {
    throw new APIError(401, "Not authenticated");
  }

  // Super-admin or admin can access
  const isSuperAdmin = await hasRole(user.id, RoleType.SUPER_ADMIN, null);
  if (isSuperAdmin) {
    return;
  }

  const isAdmin = await hasRole(user.id, RoleType.ADMIN, schoolId);
  if (isAdmin) {
    return;
  }

  // Check instructor role
  const isInstructor = await hasRole(user.id, RoleType.INSTRUCTOR, schoolId);
  if (!isInstructor) {
    throw new APIError(403, "Instructor access required");
  }
}

/**
 * Require student role
 * Super-admin, admin, and instructor can also access. Throws APIError if user doesn't have required access.
 * @param user User object
 * @param schoolId Optional school ID for school-specific student role
 */
export async function requireStudent(user: User | null, schoolId?: number | null): Promise<void> {
  if (!user) {
    throw new APIError(401, "Not authenticated");
  }

  // Super-admin or admin can access
  const isSuperAdmin = await hasRole(user.id, RoleType.SUPER_ADMIN, null);
  if (isSuperAdmin) {
    return;
  }

  const isAdmin = await hasRole(user.id, RoleType.ADMIN, schoolId);
  if (isAdmin) {
    return;
  }

  const isInstructor = await hasRole(user.id, RoleType.INSTRUCTOR, schoolId);
  if (isInstructor) {
    return;
  }

  // Check student role
  const isStudent = await hasRole(user.id, RoleType.STUDENT, schoolId);
  if (!isStudent) {
    throw new APIError(403, "Student access required");
  }
}
