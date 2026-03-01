"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/services/apiClient";
import type { LessonConflict } from "@/lib/schemas/conflict";

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
  const [conflicts, setConflicts] = useState<LessonConflict[]>([]);

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
      // T062 [US5] Handle overbooking conflict response
      if (err.response?.status === 409 && err.response?.data?.error?.details?.conflicts) {
        const conflictData = err.response.data.error.details.conflicts as LessonConflict[];
        setConflicts(conflictData);
        setError(
          `Instructor has ${conflictData.length} scheduling conflict${conflictData.length > 1 ? "s" : ""}. See details below.`,
        );
      } else {
        setError(err instanceof Error ? err.message : "Failed to assign instructor");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="assignment-form">
      <h3 className="mt-0">Assign Instructor</h3>

      <form onSubmit={handleSubmit}>
        <div className="assignment-form-group">
          <label htmlFor="instructor-select" className="assignment-form-label">
            Select Instructor <span className="required-indicator">*</span>
          </label>
          <select
            id="instructor-select"
            value={selectedInstructorId}
            onChange={(e) => setSelectedInstructorId(e.target.value)}
            required
            className="assignment-form-select"
          >
            <option value="">-- Select an instructor --</option>
            {instructors.map((instructor) => (
              <option key={instructor.id} value={instructor.user_id}>
                {instructor.name} ({instructor.email})
              </option>
            ))}
          </select>
        </div>

        <div className="assignment-form-group">
          <label htmlFor="lesson-select" className="assignment-form-label">
            Assign to
          </label>
          <select
            id="lesson-select"
            value={selectedLessonId}
            onChange={(e) => setSelectedLessonId(e.target.value)}
            className="assignment-form-select"
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
          <div className="helper-text">
            Course-level assignments apply to all lessons. Individual assignments override
            course-level for that lesson.
          </div>
        </div>

        {error && <div className="assignment-conflict-alert">{error}</div>}

        {conflicts.length > 0 && (
          <div className="assignment-conflict-alert">
            <div className="conflict-label">⚠️ Scheduling Conflicts Detected</div>
            <div className="assignment-conflict-lesson">
              The selected instructor is already assigned to overlapping lessons:
            </div>
            <ul className="assignment-conflict-list">
              {conflicts.map((conflict) => (
                <li key={`${conflict.courseId}-${conflict.courseLessonId}`}>
                  <strong>{conflict.courseName}</strong> - {conflict.lessonTitle}
                  <br />
                  {new Date(conflict.startTime).toLocaleString()} -{" "}
                  {new Date(conflict.endTime).toLocaleString()}
                  <br />
                  Location: {conflict.location}
                  <br />
                  <span className="conflict-duration">Duration: {conflict.durationHours}h</span>
                </li>
              ))}
            </ul>
            <div className="conflict-warning-text">
              Please select a different instructor or adjust the lesson schedules to resolve
              conflicts.
            </div>
          </div>
        )}

        <div className="flex-gap-md">
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Assigning..." : "Assign Instructor"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
