"use client";

import { useEffect, useState } from "react";
import { apiClient, ApiError } from "@/services/apiClient";
import type { UserMe } from "@/services/types";

export default function HomePage() {
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await apiClient.get<UserMe>("/api/v1/me");
        setUser(data);
      } catch (err) {
        if (err instanceof ApiError && err.code === "AUTHENTICATION_REQUIRED") {
          setIsAuthError(true);
          setError("Please log in to continue");
        } else {
          setError(err instanceof Error ? err.message : "Failed to load user");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (isAuthError) {
    return (
      <div>
        <h1>Welcome to School Management System</h1>
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            backgroundColor: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: "4px",
          }}
        >
          <p>
            Please{" "}
            <a href="/login" style={{ color: "#0066cc", textDecoration: "underline" }}>
              log in
            </a>{" "}
            to access your account.
          </p>
        </div>
        <div style={{ marginTop: "2rem" }}>
          <p>Use the navigation menu to access different sections based on your role.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div style={{ color: "red" }}>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Welcome to School Management System</h1>
      {user && (
        <div style={{ marginTop: "2rem" }}>
          <h2>User Profile</h2>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Name:</strong> {user.name || "N/A"}
          </p>
          <p>
            <strong>Roles:</strong>{" "}
            {user.roles.length > 0 ? user.roles.join(", ") : "None assigned"}
          </p>
        </div>
      )}
      <div style={{ marginTop: "2rem" }}>
        <p>Use the navigation menu to access different sections based on your role.</p>
      </div>
    </div>
  );
}
