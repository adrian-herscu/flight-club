"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/services/apiClient";
import { useSchool } from "@/services/schoolContext";

interface Course {
  id: number;
  school_id: number;
  title: string;
  description: string | null;
  max_students: number | null;
  status: string;
  syllabus_title?: string;
  enrolled_count?: number;
  is_enrolled?: boolean;
  spots_available?: number;
}

export default function StudentCoursesPage() {
  const router = useRouter();
  const { currentSchool } = useSchool();
  const [courses, setCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"enrolled" | "available">("enrolled");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    if (currentSchool) fetchCourses();
  }, [currentSchool]);

  const fetchCourses = async () => {
    if (!currentSchool) return;
    try {
      setLoading(true);
      // Get current user id for enrollment
      const me = await apiClient.get<{ id: number }>("/api/v1/me");
      setCurrentUserId(me.id);

      // Get all enrollments for this user to know which courses they're in
      const enrollmentsData = await apiClient
        .get<any[]>(`/api/v1/students/${me.id}/enrollments`)
        .catch(() => []);
      const myEnrollments = Array.isArray(enrollmentsData) ? enrollmentsData : [];
      const activeIds = new Set<number>(
        myEnrollments
          .filter((e: any) => e.status !== "rejected")
          .map((e: any) => e.courseId ?? e.course_id ?? e.course?.id)
          .filter(Boolean),
      );
      setEnrolledIds(activeIds);

      // Get all school courses
      const allData = await apiClient.get<any>(`/api/v1/courses?schoolId=${currentSchool.id}`);
      const all: Course[] = Array.isArray(allData)
        ? allData
        : ((allData as any).items ?? (allData as any).data ?? []);

      setCourses(all.filter((c) => activeIds.has(c.id)));
      setAvailableCourses(all.filter((c) => !activeIds.has(c.id) && c.status !== "cancelled"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestEnrollment = async (courseId: number) => {
    if (!currentSchool || !currentUserId) {
      alert("Missing school or user context. Please refresh and try again.");
      return;
    }
    try {
      await apiClient.post("/api/v1/enrollments", {
        courseId,
        studentId: currentUserId,
        schoolId: currentSchool.id,
      });
      await fetchCourses();
      alert("Enrollment request submitted! An admin will review your request.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to request enrollment");
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

  const renderCourseCard = (course: Course, showEnrollButton: boolean = false) => (
    <div
      key={course.id}
      onClick={() => router.push(`/student/courses/${course.id}`)}
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
        <div style={{ flex: 1 }}>
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

      <div
        style={{
          display: "flex",
          gap: "2rem",
          fontSize: "0.875rem",
          color: "#666",
          marginBottom: showEnrollButton ? "1rem" : 0,
        }}
      >
        <div>
          <strong>Enrollment:</strong> {course.enrolled_count ?? 0}
          {course.max_students && ` / ${course.max_students}`}
        </div>
        {course.spots_available !== undefined && (
          <div style={{ color: course.spots_available > 0 ? "#34a853" : "#ea4335" }}>
            <strong>Available Spots:</strong>{" "}
            {course.spots_available > 0 ? course.spots_available : "Waitlist Only"}
          </div>
        )}
      </div>

      {showEnrollButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRequestEnrollment(course.id);
          }}
          style={{
            width: "100%",
            padding: "0.75rem",
            background: "#4285f4",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: 500,
          }}
        >
          Request Enrollment
        </button>
      )}
    </div>
  );

  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  return (
    <div>
      <h1 style={{ marginBottom: "2rem" }}>My Courses</h1>

      {/* Tabs */}
      <div style={{ marginBottom: "2rem", borderBottom: "2px solid #f0f0f0" }}>
        <div style={{ display: "flex", gap: "2rem" }}>
          <button
            onClick={() => setActiveTab("enrolled")}
            style={{
              padding: "0.75rem 1rem",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === "enrolled" ? "2px solid #4285f4" : "2px solid transparent",
              color: activeTab === "enrolled" ? "#4285f4" : "#666",
              fontWeight: activeTab === "enrolled" ? 600 : 400,
              fontSize: "1rem",
              cursor: "pointer",
              marginBottom: "-2px",
            }}
          >
            My Enrolled Courses ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab("available")}
            style={{
              padding: "0.75rem 1rem",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === "available" ? "2px solid #4285f4" : "2px solid transparent",
              color: activeTab === "available" ? "#4285f4" : "#666",
              fontWeight: activeTab === "available" ? 600 : 400,
              fontSize: "1rem",
              cursor: "pointer",
              marginBottom: "-2px",
            }}
          >
            Available Courses ({availableCourses.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading courses...</div>
      ) : activeTab === "enrolled" ? (
        courses.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              background: "#f5f5f5",
              borderRadius: "8px",
            }}
          >
            <p style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>No enrolled courses yet</p>
            <p style={{ color: "#666", marginBottom: "2rem" }}>
              Browse available courses and request enrollment to get started.
            </p>
            <button
              onClick={() => setActiveTab("available")}
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
              View Available Courses
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {courses.map((course) => renderCourseCard(course, false))}
          </div>
        )
      ) : availableCourses.length === 0 ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            background: "#f5f5f5",
            borderRadius: "8px",
          }}
        >
          <p style={{ color: "#666" }}>No available courses at this time. Check back later!</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          {availableCourses.map((course) => renderCourseCard(course, true))}
        </div>
      )}
    </div>
  );
}
