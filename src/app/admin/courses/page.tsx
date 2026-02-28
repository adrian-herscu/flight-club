"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/services/apiClient";

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
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchCourses();
  }, [statusFilter]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
      const data = await apiClient.get<{ items: Course[] }>("/api/v1/courses", { params });
      setCourses(data.items);
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

  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

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
        <h1 style={{ margin: 0 }}>Manage Courses</h1>
        <button
          onClick={() => router.push("/admin/syllabuses")}
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
          + Create New Course
        </button>
      </div>

      <div style={{ marginBottom: "2rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <label htmlFor="status-filter" style={{ fontWeight: 500 }}>
          Filter by status:
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "0.5rem",
            borderRadius: "4px",
            border: "1px solid #ddd",
            fontSize: "1rem",
          }}
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
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            background: "#f5f5f5",
            borderRadius: "8px",
          }}
        >
          <p style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>No courses found</p>
          <p style={{ color: "#666", marginBottom: "2rem" }}>
            {statusFilter !== "all"
              ? `No ${statusFilter} courses. Try changing the filter.`
              : "Get started by creating your first course from a syllabus."}
          </p>
          <button
            onClick={() => router.push("/admin/syllabuses")}
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
            Browse Syllabuses
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          {courses.map((course) => (
            <div
              key={course.id}
              onClick={() => router.push(`/admin/courses/${course.id}`)}
              style={{
                padding: "1.5rem",
                border: "1px solid #ddd",
                borderRadius: "8px",
                background: "white",
                cursor: "pointer",
                transition: "box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 0.5rem 0" }}>{course.title}</h3>
                  {course.syllabus_title && (
                    <p style={{ margin: 0, fontSize: "0.875rem", color: "#666" }}>
                      Based on: {course.syllabus_title}
                    </p>
                  )}
                </div>
                <span
                  style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: "white",
                    background: getStatusColor(course.status),
                  }}
                >
                  {course.status}
                </span>
              </div>

              {course.description && (
                <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "1rem" }}>
                  {course.description}
                </p>
              )}

              <div style={{ display: "flex", gap: "2rem", fontSize: "0.875rem", color: "#666" }}>
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
