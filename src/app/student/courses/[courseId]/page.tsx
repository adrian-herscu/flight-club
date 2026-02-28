"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiClient } from "@/services/apiClient";

interface Course {
  id: number;
  title: string;
  description: string | null;
  max_students: number | null;
  status: string;
  syllabus_title?: string;
}

interface CourseLesson {
  id: number;
  title: string;
  description: string | null;
  sequence_order: number;
  duration_hours: number;
  start_time: string | null;
  location: string | null;
  status: string;
}

interface Instructor {
  user_name: string;
  course_lesson_id: number | null;
}

interface Evaluation {
  lesson_id: number;
  result: "PASS" | "FAIL" | null;
  feedback_notes: string | null;
  evaluated_at: string | null;
}

export default function StudentCourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const [courseData, lessonsData, instructorsData, evaluationsData] = await Promise.all([
        apiClient.get<Course>(`/api/v1/courses/${courseId}`),
        apiClient.get<{ items: CourseLesson[] }>(`/api/v1/courses/${courseId}/lessons`),
        apiClient.get<{ items: Instructor[] }>(`/api/v1/courses/${courseId}/instructors`),
        apiClient
          .get<{ items: Evaluation[] }>(`/api/v1/courses/${courseId}/evaluations/me`)
          .catch(() => ({ items: [] })),
      ]);

      setCourse(courseData);
      setLessons(lessonsData.items.sort((a, b) => a.sequence_order - b.sequence_order));
      setInstructors(instructorsData.items);
      setEvaluations(evaluationsData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planned":
        return "#FFA500";
      case "scheduled":
        return "#9C27B0";
      case "in_progress":
        return "#4CAF50";
      case "completed":
        return "#2196F3";
      case "cancelled":
        return "#9E9E9E";
      default:
        return "#666";
    }
  };

  const getEvaluationForLesson = (lessonId: number) => {
    return evaluations.find((e) => e.lesson_id === lessonId);
  };

  if (loading) return <div>Loading course details...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;
  if (!course) return <div>Course not found</div>;

  const completedLessons = lessons.filter((l) => l.status === "completed").length;
  const progressPercentage =
    lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <button
          onClick={() => router.push("/student/courses")}
          style={{
            padding: "0.5rem 1rem",
            background: "#f5f5f5",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: "pointer",
            marginBottom: "1rem",
          }}
        >
          ← Back to My Courses
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: "0 0 0.5rem 0" }}>{course.title}</h1>
            {course.description && <p style={{ color: "#666", margin: 0 }}>{course.description}</p>}
            {course.syllabus_title && (
              <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#666" }}>
                Based on: {course.syllabus_title}
              </p>
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
      </div>

      {/* Progress */}
      <div
        style={{
          marginBottom: "2rem",
          padding: "1.5rem",
          background: "#f9f9f9",
          borderRadius: "8px",
        }}
      >
        <h3 style={{ margin: "0 0 1rem 0" }}>Course Progress</h3>
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
              {completedLessons} of {lessons.length} lessons completed
            </span>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#4285f4" }}>
              {progressPercentage}%
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "8px",
              background: "#e0e0e0",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercentage}%`,
                height: "100%",
                background: "#4285f4",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      </div>

      {/* Instructors */}
      {instructors.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h3>Instructors</h3>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {Array.from(new Set(instructors.map((i) => i.user_name))).map((name, index) => (
              <span
                key={index}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#e8f0fe",
                  borderRadius: "12px",
                  fontSize: "0.875rem",
                  color: "#1967d2",
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lessons */}
      <div>
        <h2 style={{ marginBottom: "1rem" }}>Course Lessons</h2>
        {lessons.length === 0 ? (
          <p style={{ color: "#666" }}>No lessons scheduled yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {lessons.map((lesson) => {
              const evaluation = getEvaluationForLesson(lesson.id);
              return (
                <div
                  key={lesson.id}
                  style={{
                    padding: "1.25rem",
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
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: "0 0 0.5rem 0" }}>
                        Lesson {lesson.sequence_order}: {lesson.title}
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
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lesson.status}
                    </span>
                  </div>

                  {evaluation && (
                    <div
                      style={{
                        marginTop: "1rem",
                        padding: "1rem",
                        background: evaluation.result === "PASS" ? "#e6f4ea" : "#fce8e6",
                        borderRadius: "4px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <strong
                          style={{ color: evaluation.result === "PASS" ? "#137333" : "#c5221f" }}
                        >
                          Result: {evaluation.result}
                        </strong>
                        {evaluation.evaluated_at && (
                          <span style={{ fontSize: "0.75rem", color: "#666" }}>
                            {new Date(evaluation.evaluated_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {evaluation.feedback_notes && (
                        <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
                          <strong>Instructor Feedback:</strong>
                          <p style={{ margin: "0.25rem 0 0 0" }}>{evaluation.feedback_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
