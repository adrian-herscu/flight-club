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
      <button
        onClick={() => router.push("/admin/courses")}
        style={{
          padding: "0.5rem 1rem",
          background: "#f5f5f5",
          border: "1px solid #ddd",
          borderRadius: "4px",
          cursor: "pointer",
          marginBottom: "1.5rem",
        }}
      >
        ← Back to Courses
      </button>

      <h1 style={{ marginBottom: "0.5rem" }}>Create New Course</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        Create a course based on a published syllabus for
        {currentSchool ? <strong> {currentSchool.name}</strong> : " your school"}.
      </p>

      {!currentSchool && (
        <div
          style={{
            padding: "1rem",
            background: "#fff3e0",
            border: "1px solid #ffe0b2",
            borderRadius: "4px",
            marginBottom: "1.5rem",
            color: "#e65100",
          }}
        >
          ⚠️ No school selected. Use the school switcher in the sidebar to select a school.
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "1rem",
            background: "#fdecea",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            marginBottom: "1.5rem",
            color: "#721c24",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: "600px" }}>
        {/* Syllabus */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
            Syllabus <span style={{ color: "#d32f2f" }}>*</span>
          </label>
          {loadingSyllabuses ? (
            <div style={{ color: "#888", fontSize: "0.875rem" }}>Loading syllabuses...</div>
          ) : syllabuses.length > 0 ? (
            <select
              value={form.syllabusId}
              onChange={(e) => field("syllabusId", e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
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
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
              />
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem", color: "#888" }}>
                No published syllabuses found. Ask a super-admin to create and publish one first.
              </p>
            </div>
          )}
        </div>

        {/* Course name */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
            Course Name <span style={{ color: "#d32f2f" }}>*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => field("name", e.target.value)}
            placeholder="e.g. P2 Paragliding — Spring 2026 Cohort"
            required
            autoFocus={!preselectedSyllabusId}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => field("description", e.target.value)}
            placeholder="Additional details about this course run"
            rows={3}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "1rem",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Max students */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
            Max Students <span style={{ color: "#d32f2f" }}>*</span>
          </label>
          <input
            type="number"
            value={form.maxStudents}
            onChange={(e) => field("maxStudents", e.target.value)}
            placeholder="e.g. 8"
            min={1}
            required
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Dates */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
              Start Date <span style={{ color: "#d32f2f" }}>*</span>
            </label>
            <input
              type="datetime-local"
              value={form.startDate}
              onChange={(e) => field("startDate", e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
              End Date <span style={{ color: "#d32f2f" }}>*</span>
            </label>
            <input
              type="datetime-local"
              value={form.endDate}
              onChange={(e) => field("endDate", e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="submit"
            disabled={saving || !currentSchool}
            style={{
              padding: "0.75rem 2rem",
              background: saving || !currentSchool ? "#ccc" : "#4285f4",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: saving || !currentSchool ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontWeight: 500,
            }}
          >
            {saving ? "Creating..." : "Create Course"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/courses")}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#f5f5f5",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
