"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, hasSupabaseConfig } from "@/services/supabaseClient";

const DEV_USERS = [
  { email: "dev@local.com", name: "Dev Super Admin", role: "super-admin" },
  { email: "admin@local.com", name: "Dev Admin", role: "admin" },
  { email: "instructor@local.com", name: "Dev Instructor", role: "instructor" },
  { email: "student@local.com", name: "Dev Student", role: "student" },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevUser, setSelectedDevUser] = useState<string>("dev@local.com");

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setError("Missing Supabase environment variables");
      return;
    }

    // Listen for auth state changes (from OAuth callback)
    if (!supabase) return;

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push(redirectPath);
      }
    });

    // Check if already authenticated
    const checkAuth = async () => {
      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          router.push(redirectPath);
        }
      }
    };
    checkAuth();

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, [router, redirectPath]);

  const handleDevLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Dev mode: set a dev token that will be recognized by the API
      // This bypasses Supabase auth for local development
      const devToken = "dev-mode-local-testing-token";
      document.cookie = `sb-access-token=${devToken}; path=/; max-age=86400`;

      // Find the selected user
      const user = DEV_USERS.find((u) => u.email === selectedDevUser);
      if (!user) {
        throw new Error("Selected user not found");
      }

      // Set a flag to indicate dev mode
      if (typeof window !== "undefined") {
        localStorage.setItem("dev-mode", "true");
        localStorage.setItem("dev-user-email", user.email);
        localStorage.setItem("dev-user-name", user.name);
        localStorage.setItem("dev-user-role", user.role);
      }

      // Use router.push() for better compatibility with embedded browsers
      // Wait a short moment to ensure cookie is set
      await new Promise((resolve) => setTimeout(resolve, 100));
      router.push(redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dev login failed");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error("Missing Supabase environment variables");
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
      setLoading(false);
    }
  };

  return (
    <div className="p-2xl">
      <div className="card max-w-md">
        <h1 className="page-title">School Management System</h1>
        <p className="muted-text">Sign in with your Google account to continue</p>

        {error && <div className="error-box">{error}</div>}

        <button
          onClick={handleGoogleLogin}
          disabled={loading || !hasSupabaseConfig}
          className="btn btn-primary mb-md w-full"
        >
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>

        <div className="border-t border-gray-200 my-md pt-md">
          <p className="muted-text mb-sm text-sm">Development Mode</p>
          <select
            value={selectedDevUser}
            onChange={(e) => setSelectedDevUser(e.target.value)}
            className="w-full px-md py-sm border border-gray-300 rounded-md mb-sm"
          >
            {DEV_USERS.map((user) => (
              <option key={user.email} value={user.email}>
                {user.name}
              </option>
            ))}
          </select>
          <button onClick={handleDevLogin} disabled={loading} className="btn btn-secondary w-full">
            {loading ? "Logging in..." : "Dev Login (bypass auth)"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <LoginContent />;
}
