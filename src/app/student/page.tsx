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
  courseId: number;
  status: string;
  createdAt: string;
  course?: Course;
}

export default function StudentPage() {
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

  const enrolledCourses = enrollments.filter((e) => e.status === "enrolled");
  const pendingCourses = enrollments.filter((e) => e.status === "pending_approval");
  const availableCourses = courses.filter(
    (c) => !enrollments.some((e) => e.courseId === c.id && e.status !== "rejected"),
  );

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Student Dashboard</h1>
      <p>View your courses and manage enrollments.</p>

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
        <h2>Your Enrollments ({enrolledCourses.length})</h2>
        {enrolledCourses.length === 0 ? (
          <p style={{ color: "#666" }}>You're not enrolled in any courses yet.</p>
        ) : (
          <div>
            {enrolledCourses.map((enrollment) => (
              <div
                key={enrollment.id}
                style={{
                  padding: "1rem",
                  backgroundColor: "#d4edda",
                  border: "1px solid #c3e6cb",
                  borderRadius: "4px",
                  marginBottom: "0.5rem",
                }}
              >
                <h3 style={{ margin: "0 0 0.5rem 0" }}>
                  <Link
                    href={`/student/courses/${enrollment.courseId}`}
                    style={{ color: "#155724", textDecoration: "none" }}
                  >
                    Course #{enrollment.courseId}
                  </Link>
                </h3>
                <p style={{ margin: "0", fontSize: "0.9rem", color: "#155724" }}>
                  Status: Enrolled
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingCourses.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Pending Requests ({pendingCourses.length})</h2>
          <div>
            {pendingCourses.map((enrollment) => (
              <div
                key={enrollment.id}
                style={{
                  padding: "1rem",
                  backgroundColor: "#fff3cd",
                  border: "1px solid #ffeaa7",
                  borderRadius: "4px",
                  marginBottom: "0.5rem",
                }}
              >
                <p style={{ margin: "0", fontSize: "0.9rem", color: "#856404" }}>
                  Course #{enrollment.courseId} - Awaiting approval
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <h2>Available Courses ({availableCourses.length})</h2>
        {availableCourses.length === 0 ? (
          <p style={{ color: "#666" }}>No available courses at this time.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Name</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Status</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Start Date</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {availableCourses.map((course) => (
                <tr key={course.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.75rem" }}>{course.name}</td>
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
                  <td style={{ padding: "0.75rem" }}>
                    {new Date(course.startDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <Link
                      href={`/student/courses/${course.id}`}
                      style={{ color: "#007bff", textDecoration: "none", fontSize: "0.9rem" }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <Link href="/student/courses" style={{ color: "#007bff" }}>
              Browse All Courses
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
