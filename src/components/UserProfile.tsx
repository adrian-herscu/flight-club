"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabaseClient";

interface UserProfileData {
  email: string;
  name?: string;
  avatar_url?: string;
  roles?: string[];
}

export function UserProfile() {
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Check if in dev mode
        const isDevMode =
          typeof window !== "undefined" && localStorage.getItem("dev-mode") === "true";

        if (isDevMode) {
          // In dev mode, load from localStorage AND fetch roles from API
          const devUserEmail = localStorage.getItem("dev-user-email") || "dev@local.com";
          const devUserName = localStorage.getItem("dev-user-name") || "Dev User";
          const devUserRole = localStorage.getItem("dev-user-role") || "super-admin";

          // Fetch roles from API
          try {
            const response = await fetch("/api/v1/me", {
              headers: {
                Authorization: "Bearer dev-mode-local-testing-token",
                "x-dev-user-email": devUserEmail,
                "x-dev-user-name": devUserName,
                "x-dev-user-role": devUserRole,
              },
            });

            if (response.ok) {
              const data = await response.json();
              setUser({
                email: devUserEmail,
                name: devUserName,
                avatar_url: undefined,
                roles: data.data?.roles || [],
              });
            } else {
              // Fallback if API call fails
              setUser({
                email: devUserEmail,
                name: devUserName,
                avatar_url: undefined,
                roles: [],
              });
            }
          } catch (error) {
            console.error("Error fetching roles:", error);
            setUser({
              email: devUserEmail,
              name: devUserName,
              avatar_url: undefined,
              roles: [],
            });
          }
          setLoading(false);
          return;
        }

        // Supabase auth mode
        if (!supabase) {
          setLoading(false);
          return;
        }

        // Get current user from Supabase auth
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          // Extract user info from auth user metadata (Google profile data)
          const userMetadata = authUser.user_metadata || {};

          // Fetch roles from API
          try {
            const response = await fetch("/api/v1/me");
            if (response.ok) {
              const data = await response.json();
              setUser({
                email: authUser.email || "",
                name: userMetadata.full_name || authUser.email?.split("@")[0] || "User",
                avatar_url: userMetadata.avatar_url,
                roles: data.data?.roles || [],
              });
            } else {
              // Fallback if API call fails
              setUser({
                email: authUser.email || "",
                name: userMetadata.full_name || authUser.email?.split("@")[0] || "User",
                avatar_url: userMetadata.avatar_url,
                roles: [],
              });
            }
          } catch (error) {
            console.error("Error fetching roles:", error);
            setUser({
              email: authUser.email || "",
              name: userMetadata.full_name || authUser.email?.split("@")[0] || "User",
              avatar_url: userMetadata.avatar_url,
              roles: [],
            });
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div className="user-profile">
      <button onClick={() => setDropdownOpen(!dropdownOpen)} className="user-profile-btn">
        {/* Avatar */}
        <div
          className="user-profile-avatar"
          style={{
            backgroundImage: user.avatar_url ? `url('${user.avatar_url}')` : undefined,
            backgroundColor: user.avatar_url ? undefined : "#6c63ff",
          }}
        >
          {!user.avatar_url && user.name ? user.name.charAt(0).toUpperCase() : ""}
        </div>

        {/* User info */}
        <div className="user-profile-info">
          <div className="user-profile-name">{user.name}</div>
          <div className="user-profile-email">{user.email}</div>
        </div>

        {/* Chevron */}
        <div className="chevron-icon">{dropdownOpen ? "▼" : "▶"}</div>
      </button>

      {/* Dropdown menu */}
      {dropdownOpen && (
        <div className="user-profile-dropdown">
          <div className="p-md border-bottom-neutral">
            <div className="user-profile-name">{user.name}</div>
            <div className="user-profile-email">{user.email}</div>
            {user.roles && user.roles.length > 0 && (
              <div className="text-xs text-neutral-600 mt-xs">
                {user.roles.map((role) => role.replace("_", " ")).join(", ")}
              </div>
            )}
          </div>

          <button onClick={handleLogout} className="user-profile-dropdown-item required-indicator">
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
