import { failure, success } from "../_lib/response";

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

  // In production, would validate the JWT token with Supabase/Auth provider
  // For now, accept any token in dev/test
  return success({
    id: 1,
    email: "dev@local.test",
    name: "Dev User",
    roles: ["school_admin"],
  });
}
