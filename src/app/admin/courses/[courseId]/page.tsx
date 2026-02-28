"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
  updated_at: string;
}

interface CourseLesson {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  sequence_order: number;
  duration_hours: number;
  start_time: string | null;
  location: string | null;
  status: string;
}

interface Instructor {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  course_lesson_id: number | null;
  assigned_at: string;
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ title: "", description: "", max_students: "" });

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const [courseData, lessonsData, instructorsData] = await Promise.all([
        apiClient.get<Course>(`/api/v1/courses/${courseId}`),
        apiClient.get<{ items: CourseLesson[] }>(`/api/v1/courses/${courseId}/lessons`),
        apiClient.get<{ items: Instructor[] }>(`/api/v1/courses/${courseId}/instructors`),
      ]);

      setCourse(courseData);
      setLessons(lessonsData.items);
      setInstructors(instructorsData.items);
      setEditData({
        title: courseData.title,
        description: courseData.description || "",
        max_students: courseData.max_students?.toString() || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!course) return;

    try {
      const updatePayload = {
        title: editData.title,
        description: editData.description || null,
        max_students: editData.max_students ? parseInt(editData.max_students) : null,
      };

      await apiClient.patch(`/api/v1/courses/${courseId}`, updatePayload);
      await fetchCourseData();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update course");
    }
  };

  const handleCancelCourse = async () => {
    if (
      !course ||
      !confirm(
        "Are you sure you want to cancel this course? This will notify all enrolled students and instructors.",
      )
    ) {
      return;
    }

    try {
      await apiClient.delete(`/api/v1/courses/${courseId}`);
      router.push("/admin/courses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel course");
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

  if (loading) return <div>Loading course details...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;
  if (!course) return <div>Course not found</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <button
          onClick={() => router.push("/admin/courses")}
          style={{
            padding: "0.5rem 1rem",
            background: "#f5f5f5",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: "pointer",
            marginBottom: "1rem",
          }}
        >
          ← Back to Courses
        </button>

        {isEditing ? (
          <div
            style={{
              background: "#f9f9f9",
              padding: "1.5rem",
              borderRadius: "8px",
              marginTop: "1rem",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Edit Course</h2>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                  Title
                </label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "1rem",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                  Description
                </label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "1rem",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                  Max Students (optional)
                </label>
                <input
                  type="number"
                  value={editData.max_students}
                  onChange={(e) => setEditData({ ...editData, max_students: e.target.value })}
                  min="1"
                  style={{
                    width: "200px",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "1rem",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "#4285f4",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      title: course.title,
                      description: course.description || "",
                      max_students: course.max_students?.toString() || "",
                    });
                  }}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "#f5f5f5",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
            >
              <div>
                <h1 style={{ margin: "0 0 0.5rem 0" }}>{course.title}</h1>
                {course.description && (
                  <p style={{ color: "#666", margin: 0 }}>{course.description}</p>
                )}
              </div>
              <span
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "12px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "white",
                  background: getStatusColor(course.status),
                }}
              >
                {course.status}
              </span>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#4285f4",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Edit Course
              </button>
              <button
                onClick={() => router.push(`/admin/courses/${courseId}/enrollments`)}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#34a853",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Manage Enrollments
              </button>
              {course.status === "planned" && (
                <button
                  onClick={handleCancelCourse}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#ea4335",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Cancel Course
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Course Details */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div style={{ padding: "1rem", background: "#f9f9f9", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.25rem" }}>
            Max Students
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            {course.max_students || "Unlimited"}
          </div>
        </div>
        <div style={{ padding: "1rem", background: "#f9f9f9", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.25rem" }}>
            Total Lessons
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{lessons.length}</div>
        </div>
        <div style={{ padding: "1rem", background: "#f9f9f9", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.25rem" }}>
            Instructors
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            {new Set(instructors.map((i) => i.user_id)).size}
          </div>
        </div>
      </div>

      {/* Lessons */}
      <div style={{ marginBottom: "2rem" }}>
        <h2>Course Lessons</h2>
        {lessons.length === 0 ? (
          <p style={{ color: "#666" }}>No lessons found.</p>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                style={{
                  padding: "1rem",
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
                  <div>
                    <h4 style={{ margin: "0 0 0.5rem 0" }}>
                      {lesson.sequence_order}. {lesson.title}
                    </h4>
                    {lesson.description && (
                      <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", color: "#666" }}>
                        {lesson.description}
                      </p>
                    )}
                    <div style={{ fontSize: "0.875rem", color: "#666" }}>
                      <div>Duration: {lesson.duration_hours} hours</div>
                      {lesson.start_time && (
                        <div>Scheduled: {new Date(lesson.start_time).toLocaleString()}</div>
                      )}
                      {lesson.location && <div>Location: {lesson.location}</div>}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "12px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      background: getStatusColor(lesson.status),
                      color: "white",
                    }}
                  >
                    {lesson.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructors */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ margin: 0 }}>Assigned Instructors</h2>
          <button
            onClick={() => router.push(`/admin/courses/${courseId}/instructors/assign`)}
            style={{
              padding: "0.5rem 1rem",
              background: "#4285f4",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            + Assign Instructor
          </button>
        </div>

        {instructors.length === 0 ? (
          <p style={{ color: "#666" }}>No instructors assigned yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {instructors.map((instructor) => (
              <div
                key={instructor.id}
                style={{
                  padding: "1rem",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  background: "white",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{instructor.user_name}</div>
                  <div style={{ fontSize: "0.875rem", color: "#666" }}>{instructor.user_email}</div>
                  <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
                    {instructor.course_lesson_id
                      ? `Assigned to lesson #${lessons.find((l) => l.id === instructor.course_lesson_id)?.sequence_order || instructor.course_lesson_id}`
                      : "Assigned to all lessons"}
                  </div>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#666" }}>
                  Assigned: {new Date(instructor.assigned_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
