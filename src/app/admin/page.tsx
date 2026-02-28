"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/services/apiClient";
import Link from "next/link";

interface Course {
  id: number;
  name: string;
  description?: string;
  maxStudents: number;
  status: string;
  startDate: string;
  endDate: string;
}

interface StudentEnrollment {
  id: number;
  studentId: number;
  courseId: number;
  status: string;
  createdAt: string;
}

export default function AdminPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [coursesData, enrollmentsData] = await Promise.all([
          apiClient.get<Course[]>("/api/v1/courses"),
          apiClient.get<StudentEnrollment[]>("/api/v1/enrollments"),
        ]);
        setCourses(coursesData || []);
        setEnrollments(enrollmentsData || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading...</div>;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Admin Dashboard</h1>
      <p>Manage courses, enrollments, and school operations.</p>

      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#f8d7da",
            borderRadius: "4px",
            marginBottom: "2rem",
          }}
        >
          <p style={{ margin: 0, color: "#721c24" }}>{error}</p>
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <h2>Courses ({courses.length})</h2>
        {courses.length === 0 ? (
          <p style={{ color: "#666" }}>No courses yet. Create one from a syllabus.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Name</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Status</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Students</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Start Date</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.75rem" }}>
                    <Link
                      href={`/admin/courses/${course.id}`}
                      style={{ color: "#007bff", textDecoration: "none" }}
                    >
                      {course.name}
                    </Link>
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        backgroundColor: "#e7f3ff",
                        borderRadius: "3px",
                        fontSize: "0.85rem",
                      }}
                    >
                      {course.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem" }}>{course.maxStudents}</td>
                  <td style={{ padding: "0.75rem" }}>
                    {new Date(course.startDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h2>
          Pending Enrollments ({enrollments.filter((e) => e.status === "pending_approval").length})
        </h2>
        {enrollments.filter((e) => e.status === "pending_approval").length === 0 ? (
          <p style={{ color: "#666" }}>No pending enrollments.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {enrollments
              .filter((e) => e.status === "pending_approval")
              .map((enrollment) => (
                <li
                  key={enrollment.id}
                  style={{
                    padding: "0.75rem",
                    backgroundColor: "#fff3cd",
                    marginBottom: "0.5rem",
                    borderRadius: "4px",
                  }}
                >
                  Student #{enrollment.studentId} requested enrollment in Course #
                  {enrollment.courseId}
                </li>
              ))}
          </ul>
        )}
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <h3>Quick Actions</h3>
        <ul style={{ margin: 0 }}>
          <li>
            <Link href="/admin/courses" style={{ color: "#007bff" }}>
              Manage Courses
            </Link>
          </li>
          <li>
            <Link href="/admin/syllabuses" style={{ color: "#007bff" }}>
              View Syllabuses
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
