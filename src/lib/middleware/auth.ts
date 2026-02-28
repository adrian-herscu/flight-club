import { jwtVerify } from "jose";
import { PrismaClient, User } from "@prisma/client";
import { APIError } from "./error-handler";

const prisma = new PrismaClient();

export interface JWTPayload {
  sub: string;
  email: string;
  name?: string;
  aud: string;
  exp: number;
}

/**
 * Verify JWT token using jose library
 * @param token JWT token string
 * @returns Decoded JWT payload
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET || "");

  if (!secret) {
    throw new APIError(500, "SUPABASE_JWT_SECRET is not configured");
  }

  try {
    const verified = await jwtVerify(token, secret);
    return verified.payload as unknown as JWTPayload;
  } catch (error: any) {
    throw new APIError(401, "Invalid or expired token");
  }
}

/**
 * Get current user from authorization header
 * Creates or updates user in database based on token
 * @param authHeader Authorization header value (e.g., "Bearer <token>")
 * @returns User object
 */
export async function getCurrentUser(authHeader: string): Promise<User> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new APIError(401, "Not authenticated");
  }

  const token = authHeader.substring(7);

  // DEV MODE: Allow bypass for local development
  if (token === "dev-mode-local-testing-token" && process.env.NODE_ENV === "development") {
    // Return or create a dev user
    let user = await prisma.user.findUnique({
      where: { email: "dev@local.com" },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "dev@local.com",
          name: "Dev User",
          authProvider: "dev",
          authProviderId: "dev-1",
        },
      });

      // Create super-admin role for dev user
      await prisma.userRole.create({
        data: {
          userId: user.id,
          schoolId: null,
          roleType: "SUPER_ADMIN",
        },
      });
    }

    return user;
  }

  const payload = await verifyJWT(token);

  const user = await syncUserFromToken(payload);
  return user;
}

/**
 * Sync user from JWT payload
 * Creates new user if doesn't exist, updates if exists
 * @param payload JWT payload
 * @returns User object
 */
async function syncUserFromToken(payload: JWTPayload): Promise<User> {
  const email = payload.email;
  const authProviderId = payload.sub;
  const name = payload.name || null;

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Create new user
    user = await prisma.user.create({
      data: {
        email,
        name,
        authProvider: "google",
        authProviderId,
      },
    });
  } else {
    // Update existing user if name changed
    if (name && user.name !== name) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
    }
  }

  return user;
}
