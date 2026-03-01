"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/services/apiClient";
import { useSchool } from "@/services/schoolContext";

interface Course {
  id: number;
  school_id: number;
  syllabus_id: number;
  title: string;
  description: string | null;
  max_students: number | null;
  status: string;
  created_at: string;
  syllabus_title?: string;
  enrolled_count?: number;
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const { currentSchool } = useSchool();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (currentSchool) fetchCourses();
  }, [statusFilter, currentSchool]);

  const fetchCourses = async () => {
    if (!currentSchool) return;
    try {
      setLoading(true);
      const qs = new URLSearchParams({ schoolId: String(currentSchool.id) });
      if (statusFilter !== "all") qs.set("status", statusFilter);
      const data = await apiClient.get<Course[] | { items: Course[] }>(`/api/v1/courses?${qs}`);
      setCourses(Array.isArray(data) ? data : ((data as { items: Course[] }).items ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planned":
        return "#FFA500";
      case "running":
        return "#4CAF50";
      case "completed":
        return "#2196F3";
      case "cancelled":
        return "#9E9E9E";
      default:
        return "#666";
    }
  };

  if (error) return <div className="error-text">Error: {error}</div>;

  return (
    <div>
      <div className="header-row">
        <h1>Manage Courses</h1>
        <button onClick={() => router.push("/admin/courses/new")} className="btn btn-primary">
          + Create New Course
        </button>
      </div>

      <div className="mb-2xl flex-gap-md flex-center-items">
        <label htmlFor="status-filter" className="font-medium">
          Filter by status:
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select"
        >
          <option value="all">All</option>
          <option value="planned">Planned</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div>Loading courses...</div>
      ) : courses.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No courses found</p>
          <p className="empty-state-subtitle">
            {statusFilter !== "all"
              ? `No ${statusFilter} courses. Try changing the filter.`
              : "Get started by creating your first course from a syllabus."}
          </p>
          <button onClick={() => router.push("/admin/courses/new")} className="btn btn-primary">
            Create New Course
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {courses.map((course) => (
            <div
              key={course.id}
              onClick={() => router.push(`/admin/courses/${course.id}`)}
              className="card card-clickable"
            >
              <div className="card-header">
                <div>
                  <h3 className="card-title">{course.title}</h3>
                  {course.syllabus_title && (
                    <p className="muted-small">Based on: {course.syllabus_title}</p>
                  )}
                </div>
                <span className="badge" style={{ background: getStatusColor(course.status) }}>
                  {course.status}
                </span>
              </div>

              {course.description && (
                <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "1rem" }}>
                  {course.description}
                </p>
              )}

              <div className="meta-row">
                <div>
                  <strong>Enrolled:</strong> {course.enrolled_count ?? 0}
                  {course.max_students && ` / ${course.max_students}`}
                </div>
                <div>
                  <strong>Created:</strong> {new Date(course.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
