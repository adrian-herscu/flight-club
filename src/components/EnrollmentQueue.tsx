"use client";

/**
 * T064 [US12] Touch-friendly enrollment queue with mobile optimizations
 *
 * Enhancements:
 * - Larger touch targets (min 44px height)
 * - Responsive button sizing
 * - Stack buttons on mobile for easier tapping
 */

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
        `/api/v1/courses/${courseId}/enrollments?status=pending_approval`,
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
  if (error) return <div className="error-text">Error: {error}</div>;

  const pendingCount = enrollments.filter((e) => e.status === "pending_approval").length;
  const enrolledCount = enrollments.filter((e) => e.status === "enrolled").length;
  const spotsRemaining = maxStudents ? maxStudents - enrolledCount : null;

  return (
    <div>
      <div className="enrollment-status">
        <h3 className="enrollment-status-title">Enrollment Status</h3>
        <div className="enrollment-status-row">
          <div>
            <strong>Pending Approval:</strong> {pendingCount}
          </div>
          <div>
            <strong>Enrolled:</strong> {enrolledCount}
            {maxStudents && ` / ${maxStudents}`}
          </div>
          {spotsRemaining !== null && (
            <div
              className={
                spotsRemaining > 0
                  ? "enrollment-status-spots-positive"
                  : "enrollment-status-spots-negative"
              }
            >
              <strong>Spots Remaining:</strong> {spotsRemaining}
            </div>
          )}
        </div>
      </div>

      {pendingCount === 0 ? (
        <div className="enrollment-empty">
          <p className="enrollment-empty-text">No pending enrollment requests</p>
        </div>
      ) : (
        <>
          <h3 className="enrollment-request-header">Pending Requests ({pendingCount})</h3>
          <div className="enrollment-queue">
            {enrollments
              .filter((e) => e.status === "pending_approval")
              .map((enrollment) => (
                <div key={enrollment.id} className="enrollment-item">
                  <div className="enrollment-item-header">
                    <div className="flex-1">
                      <div className="enrollment-item-name">{enrollment.student_name}</div>
                      <div className="enrollment-item-email">{enrollment.student_email}</div>
                      <div className="enrollment-item-date">
                        Requested: {new Date(enrollment.requested_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="enrollment-actions">
                      <button
                        onClick={() => handleApprove(enrollment.id)}
                        disabled={actionLoading === enrollment.id}
                        className="enrollment-approve-btn"
                      >
                        {actionLoading === enrollment.id ? "Processing..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleReject(enrollment.id)}
                        disabled={actionLoading === enrollment.id}
                        className="enrollment-reject-btn"
                      >
                        {actionLoading === enrollment.id ? "Processing..." : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
