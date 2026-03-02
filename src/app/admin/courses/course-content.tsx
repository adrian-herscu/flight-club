"use client";

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

export default function NewCourseContent() {
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
      const data = await apiClient.get<{ items?: Syllabus[]; data?: Syllabus[] }>(
        "/api/v1/syllabuses",
      );
      const items = (data as any).items || (data as any).data || (Array.isArray(data) ? data : []);
      const finalSyllabuses = items.filter((s: Syllabus) => s.finalized_at !== null);
      setSyllabuses(finalSyllabuses);
    } catch (err) {
      console.error("Failed to fetch syllabuses:", err);
      setError("Failed to load syllabuses");
    } finally {
      setLoadingSyllabuses(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSchool) {
      setError("School not selected");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await apiClient.post("/api/v1/courses", {
        school_id: currentSchool.id,
        syllabus_id: parseInt(form.syllabusId),
        title: form.name,
        description: form.description || null,
        max_students: form.maxStudents ? parseInt(form.maxStudents) : null,
        start_date: form.startDate || null,
        end_date: form.endDate || null,
      });

      if (response && (response as any).id) {
        router.push("/admin/courses");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Create New Course</h1>
      </div>

      {error && <div className="error-box mb-lg">{error}</div>}
      {schoolLoading && <div className="loading-text">Loading school...</div>}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Course Name *
          </label>
          <input
            type="text"
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="syllabus" className="form-label">
            Syllabus *
          </label>
          {loadingSyllabuses ? (
            <div className="loading-text">Loading syllabuses...</div>
          ) : (
            <select
              id="syllabus"
              value={form.syllabusId}
              onChange={(e) => setForm({ ...form, syllabusId: e.target.value })}
              className="form-input"
              required
            >
              <option value="">Select a syllabus...</option>
              {syllabuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} (v{s.version})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Description
          </label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="form-input"
            rows={4}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="maxStudents" className="form-label">
              Max Students
            </label>
            <input
              type="number"
              id="maxStudents"
              value={form.maxStudents}
              onChange={(e) => setForm({ ...form, maxStudents: e.target.value })}
              className="form-input"
              min="1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="startDate" className="form-label">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="endDate" className="form-label">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="form-input"
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
