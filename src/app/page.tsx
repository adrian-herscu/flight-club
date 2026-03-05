"use client";

import { useApiData } from "@/lib/hooks/useApiData";
import { ApiError } from "@/services/apiClient";
import type { UserMe } from "@/services/types";

export default function HomePage() {
  const { data: user, loading, error } = useApiData<UserMe>("/api/v1/me");

  const isAuthError =
    error &&
    (error.includes("authentication") ||
      error.includes("Invalid token") ||
      error.includes("UNAUTHORIZED") ||
      error.includes("Not authenticated") ||
      error.includes("401"));

  if (loading) {
    return <div>Loading...</div>;
  }

  // Show login prompt for auth errors OR if no data and not a server error
  if (isAuthError || (error && !user)) {
    return (
      <div className="p-2xl">
        <h1>Welcome to School Management System</h1>
        <div className="error-box">
          <p>
            Please{" "}
            <a href="/login" className="link-primary">
              log in
            </a>{" "}
            to access your account.
          </p>
        </div>
        {error && <p style={{ fontSize: "0.875rem", color: "#666" }}>Debug: {error}</p>}
        <div className="mt-2xl">
          <p>Use the navigation menu to access different sections based on your role.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="error-text">Error: {error}</div>;
  }

  return (
    <div className="p-2xl">
      <h1>Welcome to School Management System</h1>
      {user && (
        <div className="mt-2xl">
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
      <div className="mt-2xl">
        <p>Use the navigation menu to access different sections based on your role.</p>
      </div>
    </div>
  );
}
