"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/services/apiClient";
import { useSchool } from "@/services/schoolContext";
import { useApiMutation } from "@/lib/hooks/useApiMutation";
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

  const { mutate: approveMutation, loading: approveLoading } = useApiMutation({
    onSuccess: fetchData,
  });

  const { mutate: rejectMutation, loading: rejectLoading } = useApiMutation({
    onSuccess: fetchData,
  });

  useEffect(() => {
    if (currentSchool) fetchData();
  }, [currentSchool]);

  const handleApprove = async (enrollmentId: number) => {
    await approveMutation(() => apiClient.post(`/api/v1/enrollments/${enrollmentId}/approve`, {}));
  };

  const handleReject = async (enrollmentId: number) => {
    if (!confirm("Reject this enrollment request?")) return;
    await rejectMutation(() => apiClient.post(`/api/v1/enrollments/${enrollmentId}/reject`, {}));
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
    <div className="p-2xl">
      <div className="header-row">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="muted-text">
            {currentSchool ? currentSchool.name : "Select a school in the sidebar"}
          </p>
        </div>
        <button onClick={() => router.push("/admin/courses/new")} className="btn btn-primary">
          + Create Course
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {/* Pending approvals — most important */}
      {pending.length > 0 && (
        <div className="mb-2xl">
          <h2 className="section-title">⏳ Pending Enrollment Approvals ({pending.length})</h2>
          <div className="flex-gap-1">
            {pending.map((e) => (
              <div key={e.id} className="card flex-center-between">
                <div>
                  <strong>{e.student?.name || `Student #${e.studentId ?? e.student_id}`}</strong>
                  {e.student?.email && <span className="text-muted-left">{e.student.email}</span>}
                  <div className="text-small-muted">
                    Course: {e.course?.name ?? e.course?.title ?? `#${e.courseId ?? e.course_id}`}
                  </div>
                </div>
                <div className="flex-gap-md">
                  <button
                    onClick={() => handleApprove(e.id)}
                    disabled={approveLoading || rejectLoading}
                    className={`btn btn-success ${approveLoading || rejectLoading ? "btn-disabled" : ""}`}
                  >
                    {approveLoading ? "..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(e.id)}
                    disabled={approveLoading || rejectLoading}
                    className={`btn btn-danger ${approveLoading || rejectLoading ? "btn-disabled" : ""}`}
                  >
                    {rejectLoading ? "..." : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Courses */}
      <div>
        <div className="flex-center-between mb-md">
          <h2 className="section-title">Courses ({courses.length})</h2>
          <Link href="/admin/courses" className="link-primary">
            View all →
          </Link>
        </div>
        {courses.length === 0 ? (
          <div className="empty-state">
            No courses yet.
            <button
              onClick={() => router.push("/admin/courses/new")}
              className="btn btn-primary"
              style={{ marginTop: "1rem" }}
            >
              Create First Course
            </button>
          </div>
        ) : (
          <div className="flex-gap-1">
            {courses.slice(0, 5).map((course) => (
              <div
                key={course.id}
                onClick={() => router.push(`/admin/courses/${course.id}`)}
                className="card card-clickable"
              >
                <div className="flex-1">
                  <strong>{course.title ?? course.name}</strong>
                  <div className="meta-row">
                    {course.enrolled_count ?? 0}
                    {course.max_students ? ` / ${course.max_students}` : ""} students
                  </div>
                </div>
                <span
                  className="badge"
                  style={{
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
