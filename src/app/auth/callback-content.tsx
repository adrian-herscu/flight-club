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
      if (!supabase) return;

      try {
        if (code) {
          // Exchange the code for a session - Supabase automatically handles cookies
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;

          // Supabase stores the session in localStorage and cookies automatically
          // No need to manually set cookies - just verify we have a session
          if (!data.session) {
            setError("Failed to establish session");
            return;
          }
        } else {
          // Verify we have an existing session
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            setError("No active session found");
            return;
          }
        }

        // Small delay to ensure session is fully persisted
        await new Promise(resolve => setTimeout(resolve, 100));
        
        router.replace(redirectPath);
      } catch (err) {
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
