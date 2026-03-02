import { createClient } from "@supabase/supabase-js";
import { PrismaClient, User } from "@prisma/client";
import { APIError } from "../errors";

const prisma = new PrismaClient();

// Create Supabase client for server-side auth verification
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface JWTPayload {
  sub: string;
  email: string;
  name?: string;
  aud: string;
  exp: number;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

/**
 * Verify JWT token using Supabase auth
 * @param token JWT token string
 * @returns Decoded JWT payload
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    // Use Supabase's built-in getUser to verify the token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error(error?.message || "User not found");
    }

    // Convert Supabase user to our JWTPayload format
    return {
      sub: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      aud: user.aud || "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600, // Approximate expiry
      user_metadata: user.user_metadata,
    };
  } catch (error: any) {
    console.error("❌ JWT verification failed:", error.message);
    console.error("Token preview:", token.substring(0, 50) + "...");
    throw new APIError("UNAUTHORIZED", "Invalid or expired token");
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
    throw new APIError("UNAUTHORIZED", "Not authenticated");
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
 * Auto-assigns STUDENT role to new users (except super-admins)
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

  const isNewUser = !user;

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

  // Auto-assign STUDENT role to new users (unless they're already a super-admin)
  if (isNewUser) {
    const existingRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
    });

    // Only auto-assign STUDENT role if user has no roles yet
    if (existingRoles.length === 0) {
      // Get the first school to assign them to (demo purposes)
      const firstSchool = await prisma.school.findFirst();

      if (firstSchool) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            schoolId: firstSchool.id,
            roleType: "STUDENT",
          },
        });
        console.log(`✅ Auto-assigned STUDENT role to new user: ${email}`);
      }
    }
  }

  return user;
}
