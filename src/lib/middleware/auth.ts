import { createClient } from "@supabase/supabase-js";
import { PrismaClient, User } from "@prisma/client";
import { APIError } from "../errors";

const prisma = new PrismaClient();

// Create Supabase client for server-side auth verification
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const databaseUrl = process.env.DATABASE_URL || "";
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseServiceKey);
const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseServiceKey) : null;

console.log("[AUTH CONFIG] Environment variables on startup:", {
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? "SET (" + supabaseUrl + ")" : "MISSING",
  SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? "SET" : "MISSING",
  DATABASE_URL: databaseUrl ? "SET (" + databaseUrl + ")" : "MISSING",
  NODE_ENV: process.env.NODE_ENV,
  hasSupabaseConfig,
});

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
  if (!supabase) {
    console.error("[AUTH] Supabase client not configured", {
      hasUrl: Boolean(supabaseUrl),
      hasKey: Boolean(supabaseServiceKey),
    });
    throw new APIError("UNAUTHORIZED", "Authentication provider not configured");
  }

  try {
    console.log("[AUTH] Verifying JWT token", { tokenPreview: token });

    // Use Supabase's built-in getUser to verify the token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("[AUTH] JWT verification failed", {
        error: error?.message,
        hasUser: Boolean(user),
      });
      throw new Error(error?.message || "User not found");
    }

    console.log("[AUTH] JWT verified successfully", { userId: user.id, email: user.email });

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
    console.error("[AUTH] JWT verification exception", {
      error: error.message,
      tokenPreview: token,
    });
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
  console.log("[AUTH] getCurrentUser called", {
    hasAuthHeader: Boolean(authHeader),
    nodeEnv: process.env.NODE_ENV,
  });

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("[AUTH] Missing or invalid authorization header");
    throw new APIError("UNAUTHORIZED", "Not authenticated");
  }

  const token = authHeader.substring(7);

  // DEV MODE: Allow bypass for local development
  if (token === "dev-mode-local-testing-token" && process.env.NODE_ENV === "development") {
    console.log("[AUTH] Using dev mode bypass");
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

  console.log("[AUTH] Verifying JWT for production user");
  const payload = await verifyJWT(token);

  console.log("[AUTH] Syncing user from token", { email: payload.email, sub: payload.sub });
  const user = await syncUserFromToken(payload);
  console.log("[AUTH] User synced successfully", { userId: user.id, email: user.email });
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

  console.log("[AUTH] syncUserFromToken", { email, authProviderId, name });

  try {
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    const isNewUser = !user;
    console.log("[AUTH] User lookup result", { email, exists: Boolean(user), isNewUser });

    if (!user) {
      console.log("[AUTH] Creating new user", { email, authProviderId });
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name,
          authProvider: "google",
          authProviderId,
        },
      });
      console.log("[AUTH] User created", { userId: user.id, email: user.email });
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
      console.log("[AUTH] Checking roles for new user", { userId: user.id });
      const existingRoles = await prisma.userRole.findMany({
        where: { userId: user.id },
      });

      console.log("[AUTH] Existing roles count", {
        userId: user.id,
        rolesCount: existingRoles.length,
      });

      // Only auto-assign STUDENT role if user has no roles yet
      if (existingRoles.length === 0) {
        // Get the first school to assign them to (demo purposes)
        const firstSchool = await prisma.school.findFirst();
        console.log("[AUTH] First school lookup", {
          hasSchool: Boolean(firstSchool),
          schoolId: firstSchool?.id,
        });

        if (firstSchool) {
          await prisma.userRole.create({
            data: {
              userId: user.id,
              schoolId: firstSchool.id,
              roleType: "STUDENT",
            },
          });
          console.log("[AUTH] Auto-assigned STUDENT role", {
            userId: user.id,
            email,
            schoolId: firstSchool.id,
          });
        } else {
          console.warn("[AUTH] No school found for auto-assignment", { userId: user.id, email });
        }
      }
    }

    console.log("[AUTH] User sync completed", { userId: user.id, email: user.email });
    return user;
  } catch (dbError: any) {
    console.error("[AUTH] Database sync error", {
      email,
      error: dbError.message,
      code: dbError.code,
      sqlMessage: dbError.meta?.message,
    });
    throw dbError;
  }
}
