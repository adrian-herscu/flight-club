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
  console.log("[/api/v1/me] Request received", {
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL ? "SET" : "MISSING",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING",
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING",
  });

  // Require valid authentication token
  const token = extractToken(request);

  if (!token) {
    console.error("[/api/v1/me] No token found in request");
    return failure("AUTHENTICATION_REQUIRED", "Not authenticated", 401);
  }

  console.log("[/api/v1/me] Token extracted", {
    tokenPreview: token,
    nodeEnv: process.env.NODE_ENV,
  });

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
    console.log("[/api/v1/me] Calling getCurrentUser");
    const user = await getCurrentUser(`Bearer ${token}`);
    console.log("[/api/v1/me] User retrieved", { userId: user.id, email: user.email });

    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      select: { roleType: true },
    });
    console.log("[/api/v1/me] User roles retrieved", {
      userId: user.id,
      rolesCount: userRoles.length,
    });

    const roles = userRoles.map((r) => r.roleType.toLowerCase());

    console.log("[/api/v1/me] Success response", { userId: user.id, email: user.email, roles });
    return success({
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      roles,
    });
  } catch (error: any) {
    console.error("[/api/v1/me] Authentication failed", {
      error: error.message,
      code: error.code,
      stack: error.stack,
    });
    return failure("AUTHENTICATION_REQUIRED", error.message || "Invalid token", 401);
  }
}
