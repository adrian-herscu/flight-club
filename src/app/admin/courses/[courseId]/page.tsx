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
  if (error) return <div className="error-text">Error: {error}</div>;
  if (!course) return <div>Course not found</div>;

  return (
    <div>
      <div className="header-section">
        <button onClick={() => router.push("/admin/courses")} className="back-button">
          ← Back to Courses
        </button>

        {isEditing ? (
          <div className="edit-panel">
            <h2 className="section-title">Edit Course</h2>
            <div className="edit-grid">
              <div className="field-group">
                <label className="field-label">Title</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="field-input"
                />
              </div>
              <div className="field-group">
                <label className="field-label">Description</label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={3}
                  className="field-textarea"
                />
              </div>
              <div className="field-group">
                <label className="field-label">Max Students (optional)</label>
                <input
                  type="number"
                  value={editData.max_students}
                  onChange={(e) => setEditData({ ...editData, max_students: e.target.value })}
                  min="1"
                  className="field-input"
                />
              </div>
              <div className="form-actions">
                <button onClick={handleSaveEdit} className="btn btn-primary">
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
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="header-row">
              <div>
                <h1 className="page-title">{course.title}</h1>
                {course.description && <p className="muted-paragraph">{course.description}</p>}
              </div>
              <span
                className="badge badge-large"
                style={{ background: getStatusColor(course.status) }}
              >
                {course.status}
              </span>
            </div>

            <div className="header-row" style={{ gap: "var(--spacing-md)" }}>
              <button onClick={() => setIsEditing(true)} className="btn btn-primary">
                Edit Course
              </button>
              <button
                onClick={() => router.push(`/admin/courses/${courseId}/enrollments`)}
                className="btn btn-success"
              >
                Manage Enrollments
              </button>
              {course.status === "planned" && (
                <button onClick={handleCancelCourse} className="btn btn-danger">
                  Cancel Course
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Max Students</div>
          <div className="stat-value-large">{course.max_students || "Unlimited"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Lessons</div>
          <div className="stat-value-large">{lessons.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Instructors</div>
          <div className="stat-value-large">{new Set(instructors.map((i) => i.user_id)).size}</div>
        </div>
      </div>

      <div className="lessons-section">
        <h2 className="lessons-title">Course Lessons</h2>
        {lessons.length === 0 ? (
          <p className="empty-lessons">No lessons found.</p>
        ) : (
          <div className="lessons-grid">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="lesson-card">
                <div className="lesson-header">
                  <div>
                    <h4 className="lesson-title">
                      {lesson.sequence_order}. {lesson.title}
                    </h4>
                    {lesson.description && (
                      <p className="lesson-description">{lesson.description}</p>
                    )}
                    <div className="lesson-meta">
                      <div>Duration: {lesson.duration_hours} hours</div>
                      {lesson.start_time && (
                        <div>Scheduled: {new Date(lesson.start_time).toLocaleString()}</div>
                      )}
                      {lesson.location && <div>Location: {lesson.location}</div>}
                    </div>
                  </div>
                  <span className="badge" style={{ background: getStatusColor(lesson.status) }}>
                    {lesson.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="instructors-section">
        <div className="lessons-section">
          <h2 className="lessons-title">Assigned Instructors</h2>
          <button
            onClick={() => router.push(`/admin/courses/${courseId}/instructors/assign`)}
            className="btn btn-primary"
          >
            + Assign Instructor
          </button>
        </div>

        {instructors.length === 0 ? (
          <p className="empty-lessons">No instructors assigned yet.</p>
        ) : (
          <div className="card-grid">
            {instructors.map((instructor) => (
              <div key={instructor.id} className="card">
                <div>
                  <div className="card-title">{instructor.user_name}</div>
                  <div className="muted-text">{instructor.user_email}</div>
                  <div
                    className="muted-text"
                    style={{ fontSize: "0.85rem", marginTop: "var(--spacing-xs)" }}
                  >
                    {instructor.course_lesson_id
                      ? `Assigned to lesson #${lessons.find((l) => l.id === instructor.course_lesson_id)?.sequence_order || instructor.course_lesson_id}`
                      : "Assigned to all lessons"}
                  </div>
                </div>
                <div
                  className="muted-text"
                  style={{ fontSize: "0.85rem", marginTop: "var(--spacing-md)" }}
                >
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
