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
  if (error) return <div className="error-text">Error: {error}</div>;
  if (!course) return <div>Course not found</div>;

  const completedLessons = lessons.filter((l) => l.status === "completed").length;
  const progressPercentage =
    lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="header-section">
        <button onClick={() => router.push("/student/courses")} className="back-button">
          ← Back to My Courses
        </button>

        <div className="header-row">
          <div>
            <h1 className="page-title">{course.title}</h1>
            {course.description && <p className="muted-paragraph">{course.description}</p>}
            {course.syllabus_title && (
              <p className="syllabus-text">Based on: {course.syllabus_title}</p>
            )}
          </div>
          <span className="badge badge-large" style={{ background: getStatusColor(course.status) }}>
            {course.status}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="progress-card">
        <h3 className="progress-title">Course Progress</h3>
        <div className="progress-body">
          <div className="progress-meta">
            <span className="progress-label">
              {completedLessons} of {lessons.length} lessons completed
            </span>
            <span className="progress-percent">{progressPercentage}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>
      </div>

      {/* Instructors */}
      {instructors.length > 0 && (
        <div className="instructors-section">
          <h3>Instructors</h3>
          <div className="instructor-tags">
            {Array.from(new Set(instructors.map((i) => i.user_name))).map((name, index) => (
              <span key={index} className="instructor-tag">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lessons */}
      <div>
        <h2 className="lessons-title">Course Lessons</h2>
        {lessons.length === 0 ? (
          <p className="muted-text">No lessons scheduled yet.</p>
        ) : (
          <div className="lessons-grid">
            {lessons.map((lesson) => {
              const evaluation = getEvaluationForLesson(lesson.id);
              return (
                <div key={lesson.id} className="lesson-card">
                  <div className="lesson-header">
                    <div className="lesson-body">
                      <h4 className="lesson-title">
                        Lesson {lesson.sequence_order}: {lesson.title}
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
                    <span
                      className="lesson-status-badge"
                      style={{ background: getStatusColor(lesson.status) }}
                    >
                      {lesson.status}
                    </span>
                  </div>

                  {evaluation && (
                    <div
                      className={`evaluation-box ${evaluation.result === "PASS" ? "evaluation-pass" : "evaluation-fail"}`}
                    >
                      <div className="evaluation-header">
                        <strong
                          className={evaluation.result === "PASS" ? "result-pass" : "result-fail"}
                        >
                          Result: {evaluation.result}
                        </strong>
                        {evaluation.evaluated_at && (
                          <span className="evaluated-at">
                            {new Date(evaluation.evaluated_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {evaluation.feedback_notes && (
                        <div className="feedback-notes">
                          <strong>Instructor Feedback:</strong>
                          <p className="feedback-text">{evaluation.feedback_notes}</p>
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
