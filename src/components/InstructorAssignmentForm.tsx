"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/services/apiClient";

interface Instructor {
  id: number;
  user_id: number;
  name: string;
  email: string;
}

interface CourseLesson {
  id: number;
  title: string;
  sequence_order: number;
  start_time: string | null;
  location: string | null;
}

interface ConflictDetails {
  conflicting_lesson_id: number;
  conflicting_course_title: string;
  conflicting_lesson_title: string;
  conflicting_start_time: string;
  conflicting_end_time: string;
  location: string;
}

interface InstructorAssignmentFormProps {
  courseId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function InstructorAssignmentForm({
  courseId,
  onSuccess,
  onCancel,
}: InstructorAssignmentFormProps) {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictDetails[]>([]);

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [instructorsData, lessonsData] = await Promise.all([
        apiClient.get<{ items: Instructor[] }>("/api/v1/instructors"),
        apiClient.get<{ items: CourseLesson[] }>(`/api/v1/courses/${courseId}/lessons`),
      ]);
      setInstructors(instructorsData.items);
      setLessons(lessonsData.items.sort((a, b) => a.sequence_order - b.sequence_order));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflicts([]);
    setError(null);

    if (!selectedInstructorId) {
      setError("Please select an instructor");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        instructor_id: parseInt(selectedInstructorId),
        course_lesson_id: selectedLessonId === "all" ? null : parseInt(selectedLessonId),
      };

      await apiClient.post(`/api/v1/courses/${courseId}/instructors`, payload);
      onSuccess?.();
    } catch (err: any) {
      // Check if error response contains overbooking conflict details
      if (err.response?.status === 409 && err.response?.data?.error?.details?.conflicts) {
        setConflicts(err.response.data.error.details.conflicts);
        setError("Instructor has scheduling conflicts. See details below.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to assign instructor");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: "1.5rem", background: "#f9f9f9", borderRadius: "8px" }}>
      <h3 style={{ marginTop: 0 }}>Assign Instructor</h3>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            htmlFor="instructor-select"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}
          >
            Select Instructor <span style={{ color: "#ea4335" }}>*</span>
          </label>
          <select
            id="instructor-select"
            value={selectedInstructorId}
            onChange={(e) => setSelectedInstructorId(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "1rem",
            }}
          >
            <option value="">-- Select an instructor --</option>
            {instructors.map((instructor) => (
              <option key={instructor.id} value={instructor.user_id}>
                {instructor.name} ({instructor.email})
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            htmlFor="lesson-select"
            style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}
          >
            Assign to
          </label>
          <select
            id="lesson-select"
            value={selectedLessonId}
            onChange={(e) => setSelectedLessonId(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "1rem",
            }}
          >
            <option value="all">All lessons (course-level assignment)</option>
            <optgroup label="Individual Lessons">
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  Lesson {lesson.sequence_order}: {lesson.title}
                  {lesson.start_time && ` - ${new Date(lesson.start_time).toLocaleDateString()}`}
                  {lesson.location && ` @ ${lesson.location}`}
                </option>
              ))}
            </optgroup>
          </select>
          <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
            Course-level assignments apply to all lessons. Individual assignments override
            course-level for that lesson.
          </div>
        </div>

        {error && (
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              background: "#fdecea",
              border: "1px solid #f5c6cb",
              borderRadius: "4px",
              color: "#721c24",
            }}
          >
            {error}
          </div>
        )}

        {conflicts.length > 0 && (
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              background: "#fff3cd",
              border: "1px solid #ffeeba",
              borderRadius: "4px",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "0.75rem", color: "#856404" }}>
              ⚠️ Scheduling Conflicts Detected
            </div>
            <div style={{ fontSize: "0.875rem", color: "#856404" }}>
              The selected instructor is already assigned to overlapping lessons:
            </div>
            <ul
              style={{
                margin: "0.75rem 0 0 0",
                paddingLeft: "1.5rem",
                fontSize: "0.875rem",
                color: "#856404",
              }}
            >
              {conflicts.map((conflict, index) => (
                <li key={index} style={{ marginBottom: "0.5rem" }}>
                  <strong>{conflict.conflicting_course_title}</strong> -{" "}
                  {conflict.conflicting_lesson_title}
                  <br />
                  {new Date(conflict.conflicting_start_time).toLocaleString()} -{" "}
                  {new Date(conflict.conflicting_end_time).toLocaleString()}
                  <br />
                  Location: {conflict.location}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#856404" }}>
              Please select a different instructor or adjust the lesson schedules to resolve
              conflicts.
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "0.75rem 1.5rem",
              background: submitting ? "#ccc" : "#4285f4",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: submitting ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontWeight: 500,
            }}
          >
            {submitting ? "Assigning..." : "Assign Instructor"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#f5f5f5",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: "1rem",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
