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
    <div
      style={{
        position: "relative",
        marginTop: "auto",
        paddingTop: "1rem",
        borderTop: "1px solid #ddd",
      }}
    >
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{
          background: "none",
          border: "none",
          width: "100%",
          padding: "0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          cursor: "pointer",
          borderRadius: "0.5rem",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => {
          if (window.innerWidth >= 768) {
            (e.currentTarget as HTMLElement).style.background = "#e8e8e8";
          }
        }}
        onMouseLeave={(e) => {
          if (window.innerWidth >= 768) {
            (e.currentTarget as HTMLElement).style.background = "none";
          }
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: user.avatar_url ? `url('${user.avatar_url}')` : "#6c63ff",
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
            fontSize: "0.9rem",
            flexShrink: 0,
          }}
        >
          {!user.avatar_url && user.name ? user.name.charAt(0).toUpperCase() : ""}
        </div>

        {/* User info */}
        <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: "0.9rem",
              fontWeight: "600",
              color: "#333",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.name}
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              color: "#666",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.email}
          </div>
        </div>

        {/* Chevron */}
        <div style={{ fontSize: "1rem", color: "#999", flexShrink: 0 }}>
          {dropdownOpen ? "▼" : "▶"}
        </div>
      </button>

      {/* Dropdown menu */}
      {dropdownOpen && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 0.5rem)",
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "0.5rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #eee" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#333" }}>{user.name}</div>
            <div style={{ fontSize: "0.8rem", color: "#666" }}>{user.email}</div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "none",
              border: "none",
              textAlign: "left",
              cursor: "pointer",
              color: "#d32f2f",
              fontSize: "0.9rem",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#fff3cd";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "none";
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
