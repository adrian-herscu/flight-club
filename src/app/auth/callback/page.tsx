"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, hasSupabaseConfig } from "@/services/supabaseClient";

export default function AuthCallbackPage() {
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
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;

          // Set the access token in a cookie for API requests
          if (data.session?.access_token) {
            document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
          }
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            setError("Missing OAuth code");
            return;
          }

          // Set the access token in a cookie for API requests
          if (data.session?.access_token) {
            document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
          }
        }

        router.replace(redirectPath);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to complete sign-in");
      }
    };

    finalizeLogin();
  }, [router, searchParams]);

  return (
    <div style={{ padding: "2rem" }}>
      {error ? <div style={{ color: "red" }}>Error: {error}</div> : <div>Signing you in...</div>}
    </div>
  );
}
