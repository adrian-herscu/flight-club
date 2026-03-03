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

export default function LoginContent() {
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

    if (!supabase) return;

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Verify user can access API before redirecting
        await verifyAndRedirect(session.access_token);
      }
    });

    const checkAuth = async () => {
      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          // Verify user can access API before redirecting
          await verifyAndRedirect(sessionData.session.access_token);
        }
      }
    };
    checkAuth();

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, [router, redirectPath]);

  const verifyAndRedirect = async (token: string) => {
    try {
      // Test if we can access the API with this token
      const response = await fetch("/api/v1/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        // Only redirect if API access works
        router.push(redirectPath);
      } else {
        // Session exists but API fails - clear the session and show error
        console.error("API validation failed:", response.status);
        await supabase?.auth.signOut();
        setError("Failed to validate your account. Please try logging in again.");
      }
    } catch (err) {
      console.error("API validation error:", err);
      setError("Failed to connect to the server. Please try again.");
    }
  };

  const handleDevLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const devToken = "dev-mode-local-testing-token";
      document.cookie = `sb-access-token=${devToken}; path=/; max-age=86400`;

      const user = DEV_USERS.find((u) => u.email === selectedDevUser);
      if (!user) {
        throw new Error("Selected user not found");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("dev-mode", "true");
        localStorage.setItem("dev-user-email", user.email);
        localStorage.setItem("dev-user-name", user.name);
        localStorage.setItem("dev-user-role", user.role);
      }

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

      // Construct the callback URL dynamically based on current domain
      // This works with localhost, Vercel previews, and production
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const callbackUrl = `${origin}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
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
