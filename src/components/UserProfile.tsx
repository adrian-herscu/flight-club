"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabaseClient";

interface UserProfileData {
  email: string;
  name?: string;
  avatar_url?: string;
}

export function UserProfile() {
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        // Get current user from Supabase auth
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          // Extract user info from auth user metadata (Google profile data)
          const userMetadata = authUser.user_metadata || {};
          setUser({
            email: authUser.email || "",
            name: userMetadata.full_name || authUser.email?.split("@")[0] || "User",
            avatar_url: userMetadata.avatar_url,
          });
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
          </div>

          <button onClick={handleLogout} className="user-profile-dropdown-item required-indicator">
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
