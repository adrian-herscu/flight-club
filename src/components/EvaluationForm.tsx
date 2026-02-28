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
      style={{
        padding: "1.5rem",
        border: `2px solid ${isFinalized ? getResultColor(result) : "#ddd"}`,
        borderRadius: "8px",
        background: isFinalized
          ? result === "pass"
            ? "#e6f4ea"
            : result === "fail"
              ? "#fce8e6"
              : "white"
          : "white",
      }}
    >
      {/* Student Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ margin: "0 0 0.25rem 0" }}>{student.name}</h3>
            <div style={{ fontSize: "0.875rem", color: "#666" }}>{student.email}</div>
          </div>
          {isFinalized && (
            <span
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "12px",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "white",
                background: getResultColor(result),
              }}
            >
              {result?.toUpperCase() || "NOT EVALUATED"}
            </span>
          )}
        </div>
      </div>

      {/* Evaluation Form */}
      <div style={{ display: "grid", gap: "1.25rem" }}>
        {/* Result Selection */}
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
            Result <span style={{ color: "#ea4335" }}>*</span>
          </label>
          <select
            value={result}
            onChange={(e) => setResult(e.target.value)}
            disabled={isFinalized || saving}
            required
            style={{
              width: "100%",
              padding: "1rem", // Increased from 0.75rem for touch
              minHeight: "44px", // iOS touch target minimum
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "1rem",
              background: isFinalized ? "#f5f5f5" : "white",
              cursor: isFinalized ? "not-allowed" : "pointer",
            }}
          >
            <option value="">-- Select result --</option>
            <option value="pass">PASS</option>
            <option value="fail">FAIL</option>
            <option value="not_attempted">Not Attempted (Student absent)</option>
          </select>
        </div>

        {/* Feedback Notes (visible to student) */}
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
            Feedback Notes (Visible to Student)
          </label>
          <textarea
            value={feedbackNotes}
            onChange={(e) => setFeedbackNotes(e.target.value)}
            disabled={isFinalized || saving}
            rows={4}
            placeholder="Provide constructive feedback for the student..."
            style={{
              width: "100%",
              padding: "1rem", // Increased for touch
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "1rem",
              fontFamily: "inherit",
              background: isFinalized ? "#f5f5f5" : "white",
              cursor: isFinalized ? "not-allowed" : "text",
              resize: "vertical",
              minHeight: "120px", // Adequate touch area
            }}
          />
        </div>

        {/* Admin Notes (never visible to student) */}
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
            Admin Notes (Internal Only - Never Shown to Student)
          </label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            disabled={isFinalized || saving}
            rows={3}
            placeholder="Internal notes for administrative purposes..."
            style={{
              width: "100%", // Increased for touch
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "1rem",
              fontFamily: "inherit",
              background: isFinalized ? "#f5f5f5" : "white",
              cursor: isFinalized ? "not-allowed" : "text",
              resize: "vertical",
              minHeight: "100px", // Adequate touch area
            }}
          />
        </div>

        {/* Message Display */}
        {message && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "4px",
              background: message.type === "success" ? "#e6f4ea" : "#fce8e6",
              color: message.type === "success" ? "#137333" : "#c5221f",
              fontSize: "0.875rem",
            }}
          >
            {message.text}
          </div>
        )}

        {/* Save Button */}
        {!isFinalized && (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "1rem 1.5rem", // Increased padding for touch
              minHeight: "48px", // Touch-friendly button height
              background: saving ? "#ccc" : "#4285f4",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontWeight: 500,
            }}
          >
            {saving ? "Saving..." : evaluation?.id ? "Update Evaluation" : "Save Evaluation"}
          </button>
        )}

        {isFinalized && (
          <div style={{ fontSize: "0.875rem", color: "#666", fontStyle: "italic" }}>
            ✓ This evaluation is finalized and cannot be modified. Student has been notified.
          </div>
        )}
      </div>
    </div>
  );
}
