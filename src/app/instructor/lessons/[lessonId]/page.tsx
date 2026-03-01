"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiClient } from "@/services/apiClient";
import EvaluationForm from "@/components/EvaluationForm";

interface Lesson {
  id: number;
  course_id: number;
  course_title?: string;
  title: string;
  description: string | null;
  sequence_order: number;
  duration_hours: number;
  start_time: string | null;
  location: string | null;
  status: string;
}

interface Student {
  id: number;
  user_id: number;
  name: string;
  email: string;
}

interface Evaluation {
  id: number;
  student_id: number;
  result: string | null;
  feedback_notes: string | null;
  admin_notes: string | null;
  is_finalized: boolean;
}

export default function InstructorLessonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params.lessonId as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (lessonId) {
      fetchLessonData();
    }
  }, [lessonId]);

  const fetchLessonData = async () => {
    try {
      setLoading(true);
      // In real implementation, get course_id from lesson data first
      const lessonData = await apiClient.get<Lesson>(`/api/v1/course_lessons/${lessonId}`);
      const [studentsData, evaluationsData] = await Promise.all([
        apiClient.get<{ items: Student[] }>(`/api/v1/courses/${lessonData.course_id}/students`),
        apiClient.get<{ items: Evaluation[] }>(
          `/api/v1/courses/${lessonData.course_id}/lessons/${lessonId}/evaluations`,
        ),
      ]);

      setLesson(lessonData);
      setStudents(studentsData.items);
      setEvaluations(evaluationsData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteLesson = async () => {
    if (!lesson) return;

    // Check if all students have evaluations with results
    const missingEvaluations = students.filter(
      (student) =>
        !evaluations.some(
          (e) => e.student_id === student.user_id && e.result && e.result !== "not_attempted",
        ),
    );

    if (missingEvaluations.length > 0) {
      alert(
        `Cannot complete lesson: Missing evaluations for ${missingEvaluations.map((s) => s.name).join(", ")}`,
      );
      return;
    }

    if (
      !confirm(
        "Mark this lesson as completed? All evaluations will be finalized and students will be notified.",
      )
    ) {
      return;
    }

    try {
      setCompleting(true);
      await apiClient.post(`/api/v1/courses/${lesson.course_id}/lessons/${lessonId}/complete`, {});
      alert("Lesson completed successfully! Students have been notified.");
      router.push("/instructor/schedule");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to complete lesson");
    } finally {
      setCompleting(false);
    }
  };

  const getEvaluationForStudent = (studentId: number) => {
    return evaluations.find((e) => e.student_id === studentId);
  };

  if (loading) return <div>Loading lesson details...</div>;
  if (error) return <div className="error-text">Error: {error}</div>;
  if (!lesson) return <div>Lesson not found</div>;

  const allEvaluated = students.every((student) =>
    evaluations.some(
      (e) => e.student_id === student.user_id && e.result && e.result !== "not_attempted",
    ),
  );
  const canComplete = lesson.status !== "completed" && allEvaluated;

  return (
    <div>
      {/* Header */}
      <div className="header-section">
        <button onClick={() => router.push("/instructor/schedule")} className="back-button">
          ← Back to Schedule
        </button>

        <div className="header-row">
          <div>
            {lesson.course_title && <div className="course-label">{lesson.course_title}</div>}
            <h1 className="page-title">
              Lesson {lesson.sequence_order}: {lesson.title}
            </h1>
            {lesson.description && <p className="muted-paragraph">{lesson.description}</p>}
          </div>
          {canComplete && (
            <button
              onClick={handleCompleteLesson}
              disabled={completing}
              className="btn btn-success"
            >
              {completing ? "Completing..." : "Complete Lesson"}
            </button>
          )}
        </div>

        {/* Lesson Details */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Duration</div>
            <div className="stat-value-large">{lesson.duration_hours} hours</div>
          </div>
          {lesson.start_time && (
            <div className="stat-card">
              <div className="stat-label">Scheduled</div>
              <div className="stat-value-medium">
                {new Date(lesson.start_time).toLocaleString()}
              </div>
            </div>
          )}
          {lesson.location && (
            <div className="stat-card">
              <div className="stat-label">Location</div>
              <div className="stat-value-large">{lesson.location}</div>
            </div>
          )}
          <div className="stat-card">
            <div className="stat-label">Evaluated</div>
            <div className="stat-value-large">
              {evaluations.filter((e) => e.result && e.result !== "not_attempted").length} /{" "}
              {students.length}
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Forms */}
      <div>
        <h2 className="section-title">Student Evaluations</h2>
        {lesson.status === "completed" && (
          <div className="completed-box">
            <strong className="completed-strong">✓ Lesson Completed</strong>
            <p className="completed-text">
              All evaluations are finalized. Students have been notified of their feedback.
            </p>
          </div>
        )}

        <div className="evaluation-grid">
          {students.map((student) => {
            const evaluation = getEvaluationForStudent(student.user_id);
            return (
              <EvaluationForm
                key={student.id}
                lessonId={parseInt(lessonId)}
                courseId={lesson.course_id}
                student={student}
                evaluation={evaluation || undefined}
                isFinalized={lesson.status === "completed"}
                onUpdate={fetchLessonData}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
