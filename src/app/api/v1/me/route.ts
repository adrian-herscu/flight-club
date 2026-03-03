import { failure, success } from "../_lib/response";
import { getCurrentUser } from "@/lib/middleware/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function extractToken(request: Request): string | null {
  // Try Authorization header first (Bearer token)
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring("Bearer ".length);
  }

  // Fall back to cookie for dev
  const cookieHeader = request.headers.get("cookie") || "";
  const tokenEntry = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((entry) => entry.startsWith("sb-access-token="));

  return tokenEntry ? tokenEntry.substring("sb-access-token=".length) : null;
}

export async function GET(request: Request) {
  // Require valid authentication token
  const token = extractToken(request);

  if (!token) {
    return failure("AUTHENTICATION_REQUIRED", "Not authenticated", 401);
  }

  // DEV MODE: In development, read user info from header or default
  if (token === "dev-mode-local-testing-token" && process.env.NODE_ENV === "development") {
    // Get the dev user email from the request header (sent by client)
    const devUserEmail = request.headers.get("x-dev-user-email") || "dev@local.com";
    const devUserName = request.headers.get("x-dev-user-name") || "Dev User";
    const devUserRole = request.headers.get("x-dev-user-role") || "super-admin";

    // Map role to roles array
    const rolesMap: { [key: string]: string[] } = {
      "super-admin": ["super_admin"],
      admin: ["school_admin"],
      instructor: ["instructor"],
      student: ["student"],
    };

    return success({
      id: 1,
      email: devUserEmail,
      name: devUserName,
      roles: rolesMap[devUserRole] || ["student"],
    });
  }

  try {
    const user = await getCurrentUser(`Bearer ${token}`);

    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      select: { roleType: true },
    });

    const roles = userRoles.map((r) => r.roleType.toLowerCase());

    return success({
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      roles,
    });
  } catch {
    return failure("AUTHENTICATION_REQUIRED", "Invalid token", 401);
  }
}
