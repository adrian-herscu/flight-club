"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/services/apiClient";

interface Student {
  id: number;
  user_id: number;
  name: string;
  email: string;
}

interface Evaluation {
  id?: number;
  student_id: number;
  result: string | null;
  feedback_notes: string | null;
  admin_notes: string | null;
  is_finalized?: boolean;
}

interface EvaluationFormProps {
  lessonId: number;
  courseId: number;
  student: Student;
  evaluation?: Evaluation;
  isFinalized: boolean;
  onUpdate?: () => void;
}

/**
 * T064 [US12] Touch-friendly evaluation form with mobile optimizations
 *
 * Enhancements:
 * - Larger tap targets (min 44px height)
 * - Improved spacing for touch interactions
 * - Responsive layout adjustments
 */

export default function EvaluationForm({
  lessonId,
  courseId,
  student,
  evaluation,
  isFinalized,
  onUpdate,
}: EvaluationFormProps) {
  const [result, setResult] = useState<string>(evaluation?.result || "");
  const [feedbackNotes, setFeedbackNotes] = useState<string>(evaluation?.feedback_notes || "");
  const [adminNotes, setAdminNotes] = useState<string>(evaluation?.admin_notes || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (evaluation) {
      setResult(evaluation.result || "");
      setFeedbackNotes(evaluation.feedback_notes || "");
      setAdminNotes(evaluation.admin_notes || "");
    }
  }, [evaluation]);

  const handleSave = async () => {
    if (!result || result === "not_attempted") {
      setMessage({ type: "error", text: "Please select PASS or FAIL result" });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const payload = {
        student_id: student.user_id,
        course_lesson_id: lessonId,
        result,
        feedback_notes: feedbackNotes || null,
        admin_notes: adminNotes || null,
      };

      if (evaluation?.id) {
        // Update existing evaluation
        await apiClient.patch(`/api/v1/evaluations/${evaluation.id}`, payload);
      } else {
        // Create new evaluation
        await apiClient.post("/api/v1/evaluations", payload);
      }

      setMessage({ type: "success", text: "Evaluation saved successfully" });
      onUpdate?.();

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save evaluation",
      });
    } finally {
      setSaving(false);
    }
  };

  const getResultColor = (resultValue: string) => {
    switch (resultValue) {
      case "pass":
        return "#34a853";
      case "fail":
        return "#ea4335";
      default:
        return "#666";
    }
  };

  return (
    <div
      className={`evaluation-form ${
        isFinalized
          ? result === "pass"
            ? "form-evaluation-finalized-pass"
            : result === "fail"
              ? "form-evaluation-finalized-fail"
              : "form-evaluation-finalized"
          : ""
      }`}
      style={{
        borderColor: isFinalized ? getResultColor(result) : undefined,
      }}
    >
      <div className="mb-xl">
        <div className="flex-center-between">
          <div>
            <h3 className="section-subtitle">{student.name}</h3>
            <div className="muted-text">{student.email}</div>
          </div>
          {isFinalized && (
            <span
              className="result-badge"
              style={{
                background: getResultColor(result),
              }}
            >
              {result?.toUpperCase() || "NOT EVALUATED"}
            </span>
          )}
        </div>
      </div>

      <div className="grid-gap-lg">
        {/* Result Selection */}
        <div className="evaluation-form-section">
          <label className="evaluation-form-label">
            Result <span className="required-indicator">*</span>
          </label>
          <select
            value={result}
            onChange={(e) => setResult(e.target.value)}
            disabled={isFinalized || saving}
            required
            className={`field-input ${isFinalized ? "form-select-disabled" : ""}`}
          >
            <option value="">-- Select result --</option>
            <option value="pass">PASS</option>
            <option value="fail">FAIL</option>
            <option value="not_attempted">Not Attempted (Student absent)</option>
          </select>
        </div>

        {/* Feedback Notes (visible to student) */}
        <div className="evaluation-form-section">
          <label className="evaluation-form-label">Feedback Notes (Visible to Student)</label>
          <textarea
            value={feedbackNotes}
            onChange={(e) => setFeedbackNotes(e.target.value)}
            disabled={isFinalized || saving}
            rows={4}
            placeholder="Provide constructive feedback for the student..."
            className={`evaluation-form-textarea ${isFinalized ? "textarea-disabled" : ""}`}
          />
        </div>

        {/* Admin Notes (never visible to student) */}
        <div className="evaluation-form-section">
          <label className="evaluation-form-label">
            Admin Notes (Internal Only - Never Shown to Student)
          </label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            disabled={isFinalized || saving}
            rows={3}
            placeholder="Internal notes for administrative purposes..."
            className={`evaluation-form-textarea ${isFinalized ? "textarea-disabled" : ""}`}
          />
        </div>

        {/* Message Display */}
        {message && <div className={`evaluation-form-message ${message.type}`}>{message.text}</div>}

        {/* Save Button */}
        {!isFinalized && (
          <button onClick={handleSave} disabled={saving} className="evaluation-form-save-btn">
            {saving ? "Saving..." : evaluation?.id ? "Update Evaluation" : "Save Evaluation"}
          </button>
        )}

        {isFinalized && (
          <div className="subtitle-muted">
            ✓ This evaluation is finalized and cannot be modified. Student has been notified.
          </div>
        )}
      </div>
    </div>
  );
}
