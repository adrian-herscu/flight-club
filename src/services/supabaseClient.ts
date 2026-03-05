import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (typeof window !== "undefined") {
  console.log("[Supabase Client] Browser environment:", {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? supabaseUrl : "MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? "SET" : "MISSING",
    hasSupabaseConfig,
  });
} else {
  console.log("[Supabase Client] Server environment:", {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? supabaseUrl : "MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? "SET" : "MISSING",
    hasSupabaseConfig,
  });
}

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseAnonKey) : null;

/**
 * Get current auth token for API requests
 */
export async function getAuthToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
