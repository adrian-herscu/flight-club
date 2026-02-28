"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/services/apiClient";

interface Enrollment {
  id: number;
  student_id: number;
  course_id: number;
  status: string;
  student_name: string;
  student_email: string;
  requested_at: string;
  position: number | null;
}

interface EnrollmentQueueProps {
  courseId: number;
  maxStudents: number | null;
  onUpdate?: () => void;
}

export default function EnrollmentQueue({ courseId, maxStudents, onUpdate }: EnrollmentQueueProps) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchEnrollments();
  }, [courseId]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<{ items: Enrollment[] }>(
        `/api/v1/courses/${courseId}/enrollments`,
        { params: { status: "pending_approval" } },
      );
      setEnrollments(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load enrollments");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (enrollmentId: number) => {
    try {
      setActionLoading(enrollmentId);
      await apiClient.post(`/api/v1/enrollments/${enrollmentId}/approve`, {});
      await fetchEnrollments();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve enrollment");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (enrollmentId: number) => {
    const reason = prompt("Enter rejection reason (optional):");
    if (reason === null) return; // User cancelled

    try {
      setActionLoading(enrollmentId);
      await apiClient.post(`/api/v1/enrollments/${enrollmentId}/reject`, {
        reason: reason || undefined,
      });
      await fetchEnrollments();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject enrollment");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div>Loading enrollment requests...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  const pendingCount = enrollments.filter((e) => e.status === "pending_approval").length;
  const enrolledCount = enrollments.filter((e) => e.status === "enrolled").length;
  const spotsRemaining = maxStudents ? maxStudents - enrolledCount : null;

  return (
    <div>
      <div
        style={{
          marginBottom: "1.5rem",
          padding: "1rem",
          background: "#f9f9f9",
          borderRadius: "8px",
        }}
      >
        <h3 style={{ margin: "0 0 0.5rem 0" }}>Enrollment Status</h3>
        <div style={{ display: "flex", gap: "2rem", fontSize: "0.875rem" }}>
          <div>
            <strong>Pending Approval:</strong> {pendingCount}
          </div>
          <div>
            <strong>Enrolled:</strong> {enrolledCount}
            {maxStudents && ` / ${maxStudents}`}
          </div>
          {spotsRemaining !== null && (
            <div style={{ color: spotsRemaining > 0 ? "#34a853" : "#ea4335" }}>
              <strong>Spots Remaining:</strong> {spotsRemaining}
            </div>
          )}
        </div>
      </div>

      {pendingCount === 0 ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            background: "#f5f5f5",
            borderRadius: "8px",
          }}
        >
          <p style={{ color: "#666" }}>No pending enrollment requests</p>
        </div>
      ) : (
        <>
          <h3 style={{ marginBottom: "1rem" }}>Pending Requests ({pendingCount})</h3>
          <div style={{ display: "grid", gap: "1rem" }}>
            {enrollments
              .filter((e) => e.status === "pending_approval")
              .map((enrollment) => (
                <div
                  key={enrollment.id}
                  style={{
                    padding: "1.25rem",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    background: "white",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                        {enrollment.student_name}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" }}>
                        {enrollment.student_email}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#666" }}>
                        Requested: {new Date(enrollment.requested_at).toLocaleString()}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        minWidth: "fit-content",
                        paddingLeft: "1rem",
                      }}
                    >
                      <button
                        onClick={() => handleApprove(enrollment.id)}
                        disabled={actionLoading === enrollment.id}
                        style={{
                          padding: "0.625rem 1.25rem",
                          background: actionLoading === enrollment.id ? "#ccc" : "#34a853",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: actionLoading === enrollment.id ? "not-allowed" : "pointer",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          minWidth: "90px",
                        }}
                      >
                        {actionLoading === enrollment.id ? "Processing..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleReject(enrollment.id)}
                        disabled={actionLoading === enrollment.id}
                        style={{
                          padding: "0.625rem 1.25rem",
                          background: actionLoading === enrollment.id ? "#ccc" : "#ea4335",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: actionLoading === enrollment.id ? "not-allowed" : "pointer",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          minWidth: "90px",
                        }}
                      >
                        {actionLoading === enrollment.id ? "Processing..." : "Reject"}
                      </button>
                    </div>
                  </div>

                  {spotsRemaining !== null && spotsRemaining <= 0 && (
                    <div
                      style={{
                        marginTop: "0.75rem",
                        padding: "0.5rem",
                        background: "#fff3cd",
                        borderRadius: "4px",
                        fontSize: "0.875rem",
                        color: "#856404",
                      }}
                    >
                      ⚠️ Course is at capacity. Approving will add student to waitlist.
                    </div>
                  )}
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
