"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabaseClient";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      if (supabase) {
        await supabase.auth.signOut();
      }

      document.cookie = "sb-access-token=; path=/; max-age=0; samesite=lax";

      if (typeof window !== "undefined") {
        localStorage.removeItem("dev-mode");
        localStorage.removeItem("dev-user-email");
        localStorage.removeItem("dev-user-name");
        localStorage.removeItem("dev-user-role");
      }

      router.push("/login");
    };

    handleLogout();
  }, [router]);

  return (
    <div style={{ padding: "2rem" }}>
      <p>Signing out...</p>
    </div>
  );
}
