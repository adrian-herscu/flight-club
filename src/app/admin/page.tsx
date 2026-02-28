"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/services/apiClient";
import { useSchool } from "@/services/schoolContext";
import Link from "next/link";

interface Course {
  id: number;
  name?: string;
  title?: string;
  status: string;
  max_students?: number;
  maxStudents?: number;
  enrolled_count?: number;
}

interface PendingEnrollment {
  id: number;
  studentId?: number;
  student_id?: number;
  student?: { name: string; email: string };
  courseId?: number;
  course_id?: number;
  course?: { name?: string; title?: string };
  status: string;
  createdAt?: string;
  created_at?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { currentSchool } = useSchool();
  const [courses, setCourses] = useState<Course[]>([]);
  const [pending, setPending] = useState<PendingEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    if (currentSchool) fetchData();
  }, [currentSchool]);

  const fetchData = async () => {
    if (!currentSchool) return;
    setLoading(true);
    setError(null);
    try {
      const coursesData = await apiClient.get<any>(`/api/v1/courses?schoolId=${currentSchool.id}`);
      const allCourses: Course[] = Array.isArray(coursesData)
        ? coursesData
        : ((coursesData as any).items ?? []);
      setCourses(allCourses);

      // Collect pending enrollments across all courses
      const pendingResults = await Promise.all(
        allCourses.slice(0, 20).map((c) =>
          apiClient
            .get<any>(`/api/v1/courses/${c.id}/pending-approvals`)
            .then((d) => (Array.isArray(d) ? d : ((d as any).items ?? [])))
            .catch(() => []),
        ),
      );
      setPending(pendingResults.flat());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (enrollmentId: number) => {
    setActionLoading(enrollmentId);
    try {
      await apiClient.post(`/api/v1/enrollments/${enrollmentId}/approve`, {});
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (enrollmentId: number) => {
    if (!confirm("Reject this enrollment request?")) return;
    setActionLoading(enrollmentId);
    try {
      await apiClient.post(`/api/v1/enrollments/${enrollmentId}/reject`, {});
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div>Loading...</div>;

  const statusColor = (s: string) =>
    s === "planned"
      ? "#FFA500"
      : s === "running"
        ? "#4CAF50"
        : s === "completed"
          ? "#2196F3"
          : "#9E9E9E";

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 0.25rem 0" }}>Admin Dashboard</h1>
          <p style={{ margin: 0, color: "#666" }}>
            {currentSchool ? currentSchool.name : "Select a school in the sidebar"}
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/courses/new")}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#4285f4",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          + Create Course
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "1rem",
            background: "#fdecea",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            marginBottom: "2rem",
            color: "#721c24",
          }}
        >
          {error}
        </div>
      )}

      {/* Pending approvals — most important */}
      {pending.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>
            ⏳ Pending Enrollment Approvals ({pending.length})
          </h2>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {pending.map((e) => (
              <div
                key={e.id}
                style={{
                  padding: "1rem",
                  border: "1px solid #ffe0b2",
                  background: "#fff8f1",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>{e.student?.name || `Student #${e.studentId ?? e.student_id}`}</strong>
                  {e.student?.email && (
                    <span style={{ color: "#666", fontSize: "0.875rem", marginLeft: "0.5rem" }}>
                      {e.student.email}
                    </span>
                  )}
                  <div style={{ fontSize: "0.875rem", color: "#888", marginTop: "0.25rem" }}>
                    Course: {e.course?.name ?? e.course?.title ?? `#${e.courseId ?? e.course_id}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => handleApprove(e.id)}
                    disabled={actionLoading === e.id}
                    style={{
                      padding: "0.4rem 1rem",
                      background: actionLoading === e.id ? "#ccc" : "#34a853",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(e.id)}
                    disabled={actionLoading === e.id}
                    style={{
                      padding: "0.4rem 1rem",
                      background: actionLoading === e.id ? "#ccc" : "#d32f2f",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Courses */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ margin: 0 }}>Courses ({courses.length})</h2>
          <Link href="/admin/courses" style={{ color: "#4285f4", fontSize: "0.875rem" }}>
            View all →
          </Link>
        </div>
        {courses.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              background: "#f5f5f5",
              borderRadius: "8px",
              textAlign: "center",
              color: "#666",
            }}
          >
            No courses yet.
            <button
              onClick={() => router.push("/admin/courses/new")}
              style={{
                display: "block",
                margin: "1rem auto 0",
                padding: "0.5rem 1.5rem",
                background: "#4285f4",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Create First Course
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {courses.slice(0, 5).map((course) => (
              <div
                key={course.id}
                onClick={() => router.push(`/admin/courses/${course.id}`)}
                style={{
                  padding: "1rem",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  background: "white",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div>
                  <strong>{course.title ?? course.name}</strong>
                  <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
                    {course.enrolled_count ?? 0}
                    {course.max_students ? ` / ${course.max_students}` : ""} students
                  </div>
                </div>
                <span
                  style={{
                    padding: "0.2rem 0.6rem",
                    borderRadius: "10px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "white",
                    background: statusColor(course.status),
                  }}
                >
                  {course.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
