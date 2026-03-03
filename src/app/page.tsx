"use client";

import { useApiData } from "@/lib/hooks/useApiData";
import { ApiError } from "@/services/apiClient";
import type { UserMe } from "@/services/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { data: user, loading, error } = useApiData<UserMe>("/api/v1/me");
  const router = useRouter();

  const isAuthError = error && (error.includes("authentication") || error.includes("Invalid token") || error.includes("UNAUTHORIZED"));

  useEffect(() => {
    if (isAuthError) {
      // Redirect to login if not authenticated
      router.push("/login?redirect=/");
    }
  }, [isAuthError, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (isAuthError) {
    return (
      <div className="p-2xl">
        <div>Redirecting to login...</div>
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
