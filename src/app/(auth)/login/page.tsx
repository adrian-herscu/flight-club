"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, hasSupabaseConfig } from "@/services/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleDevLogin = () => {
    // Dev mode: set a dev token that will be recognized by the API
    // This bypasses Supabase auth for local development
    const devToken = "dev-mode-local-testing-token";
    document.cookie = `sb-access-token=${devToken}; path=/; max-age=86400`;

    // Set a flag to indicate dev mode
    localStorage.setItem("dev-mode", "true");
    localStorage.setItem("dev-user-email", "dev@local.com");
    localStorage.setItem("dev-user-name", "Dev User");

    // Redirect to home
    window.location.href = redirectPath;
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

        <button onClick={handleDevLogin} className="btn btn-secondary w-full">
          Dev Login (bypass auth)
        </button>
      </div>
    </div>
  );
}
