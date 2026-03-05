"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, hasSupabaseConfig } from "@/services/supabaseClient";

export default function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirectPath = searchParams.get("redirect") || "/";
    const code = searchParams.get("code");
    const errorDescription = searchParams.get("error_description");

    if (!hasSupabaseConfig) {
      setError("Missing Supabase environment variables");
      return;
    }

    if (errorDescription) {
      setError(errorDescription);
      return;
    }

    const finalizeLogin = async () => {
      if (!supabase) {
        console.error("[AUTH-CALLBACK] Supabase client not available");
        return;
      }

      console.log("[AUTH-CALLBACK] Starting finalize login", { hasCode: Boolean(code) });

      try {
        let accessToken: string | null = null;

        if (code) {
          console.log("[AUTH-CALLBACK] Exchanging code for session");
          // Exchange the code for a session - Supabase automatically handles cookies
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("[AUTH-CALLBACK] Code exchange failed", { error: exchangeError.message });
            throw exchangeError;
          }

          // Supabase stores the session in localStorage and cookies automatically
          // No need to manually set cookies - just verify we have a session
          if (!data.session) {
            console.error("[AUTH-CALLBACK] No session after code exchange");
            setError("Failed to establish session");
            return;
          }

          console.log("[AUTH-CALLBACK] Session established", { email: data.session.user?.email });
          accessToken = data.session.access_token;
        } else {
          // Verify we have an existing session
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            setError("No active session found");
            return;
          }

          accessToken = data.session.access_token;
        }

        // Persist a backend-readable auth cookie for API routes
        if (accessToken) {
          const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
          document.cookie = `sb-access-token=${accessToken}; path=/; max-age=3600; samesite=lax${isSecure ? "; secure" : ""}`;
          console.log("[AUTH-CALLBACK] Set auth cookie", {
            isSecure,
            tokenPreview: accessToken,
          });
        }

        // Small delay to ensure session is fully persisted
        await new Promise((resolve) => setTimeout(resolve, 100));

        console.log("[AUTH-CALLBACK] Redirecting to", { redirectPath });
        router.replace(redirectPath);
      } catch (err) {
        console.error("[AUTH-CALLBACK] Login finalization failed", {
          error: err instanceof Error ? err.message : String(err),
        });
        setError(err instanceof Error ? err.message : "Failed to complete sign-in");
      }
    };

    finalizeLogin();
  }, [router, searchParams]);

  return (
    <div style={{ padding: "2rem" }}>
      {error ? <div className="error-text">Error: {error}</div> : <div>Signing you in...</div>}
    </div>
  );
}
