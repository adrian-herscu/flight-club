"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/services/apiClient";
import { useSchool } from "@/services/schoolContext";

interface Syllabus {
  id: number;
  title: string;
  description: string | null;
  version: number;
  lesson_count: number;
  finalized_at: string | null;
}

export default function NewCoursePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentSchool, loading: schoolLoading } = useSchool();

  const preselectedSyllabusId = searchParams.get("syllabus");

  const [syllabuses, setSyllabuses] = useState<Syllabus[]>([]);
  const [loadingSyllabuses, setLoadingSyllabuses] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    syllabusId: preselectedSyllabusId || "",
    name: "",
    description: "",
    maxStudents: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchSyllabuses();
  }, []);

  const fetchSyllabuses = async () => {
    try {
      setLoadingSyllabuses(true);
      // List all syllabuses and filter to FINAL ones
      const data = await apiClient.get<{ items?: Syllabus[]; data?: Syllabus[] }>(
        "/api/v1/syllabuses",
      );
      const items = (data as any).items || (data as any).data || (Array.isArray(data) ? data : []);
      setSyllabuses(items);
    } catch {
      // Fallback: syllabuses list will be empty, user can still pick if they know the ID
    } finally {
      setLoadingSyllabuses(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSchool) {
      setError("No school selected. Please select a school first.");
      return;
    }
    if (!form.syllabusId || !form.name || !form.startDate || !form.endDate || !form.maxStudents) {
      setError("Please fill in all required fields.");
      return;
    }
    if (new Date(form.startDate) >= new Date(form.endDate)) {
      setError("End date must be after start date.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await apiClient.post<{ id: number }>("/api/v1/courses", {
        schoolId: currentSchool.id,
        syllabusId: parseInt(form.syllabusId),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        maxStudents: parseInt(form.maxStudents),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      });
      router.push(`/admin/courses/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course");
      setSaving(false);
    }
  };

  const field = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  if (schoolLoading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={() => router.push("/admin/courses")} className="back-button">
        ← Back to Courses
      </button>

      <h1 className="page-title">Create New Course</h1>
      <p className="muted-paragraph">
        Create a course based on a published syllabus for
        {currentSchool ? <strong> {currentSchool.name}</strong> : " your school"}.
      </p>

      {!currentSchool && (
        <div className="warning-box">
          ⚠️ No school selected. Use the school switcher in the sidebar to select a school.
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field-group">
          <label className="field-label">
            Syllabus <span className="required">*</span>
          </label>
          {loadingSyllabuses ? (
            <div className="helper-text">Loading syllabuses...</div>
          ) : syllabuses.length > 0 ? (
            <select
              value={form.syllabusId}
              onChange={(e) => field("syllabusId", e.target.value)}
              required
              className="field-input"
            >
              <option value="">— Select a syllabus —</option>
              {syllabuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} (v{s.version}, {s.lesson_count} lessons)
                </option>
              ))}
            </select>
          ) : (
            <div>
              <input
                type="number"
                value={form.syllabusId}
                onChange={(e) => field("syllabusId", e.target.value)}
                placeholder="Enter syllabus ID"
                required
                className="field-input"
              />
              <p className="helper-text">
                No published syllabuses found. Ask a super-admin to create and publish one first.
              </p>
            </div>
          )}
        </div>

        <div className="field-group">
          <label className="field-label">
            Course Name <span className="required">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => field("name", e.target.value)}
            placeholder="e.g. P2 Paragliding — Spring 2026 Cohort"
            required
            autoFocus={!preselectedSyllabusId}
            className="field-input"
          />
        </div>

        <div className="field-group">
          <label className="field-label">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => field("description", e.target.value)}
            placeholder="Additional details about this course run"
            rows={3}
            className="field-textarea"
          />
        </div>

        <div className="field-group">
          <label className="field-label">
            Max Students <span className="required">*</span>
          </label>
          <input
            type="number"
            value={form.maxStudents}
            onChange={(e) => field("maxStudents", e.target.value)}
            placeholder="e.g. 8"
            min={1}
            required
            className="field-input"
          />
        </div>

        <div className="grid-gap-lg" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label className="field-label">
              Start Date <span className="required">*</span>
            </label>
            <input
              type="datetime-local"
              value={form.startDate}
              onChange={(e) => field("startDate", e.target.value)}
              required
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">
              End Date <span className="required">*</span>
            </label>
            <input
              type="datetime-local"
              value={form.endDate}
              onChange={(e) => field("endDate", e.target.value)}
              required
              className="field-input"
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving || !currentSchool} className="submit-button">
            {saving ? "Creating..." : "Create Course"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/courses")}
            className="cancel-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
