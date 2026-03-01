"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/services/apiClient";

export default function NewSyllabusPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const created = await apiClient.post<{ id: number }>("/api/v1/syllabuses", {
        title: title.trim(),
        description: description.trim() || undefined,
      });
      router.push(`/super-admin/syllabuses/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create syllabus");
      setSaving(false);
    }
  };

  return (
    <div>
      <button onClick={() => router.push("/super-admin/syllabuses")} className="back-button">
        ← Back to Syllabuses
      </button>

      <h1 className="page-title">Create New Syllabus</h1>
      <p className="muted-paragraph">
        A syllabus defines the lesson structure for a training programme. After creating it, add
        lessons, then publish it to make it available for schools to use.
      </p>

      {error && <div className="error-box">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field-group">
          <label className="field-label">
            Title <span className="required">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. P2 Paragliding Certification"
            required
            autoFocus
            className="field-input"
          />
        </div>

        <div className="field-group">
          <label className="field-label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what this syllabus covers"
            rows={4}
            className="field-textarea"
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving || !title.trim()} className="submit-button">
            {saving ? "Creating..." : "Create Syllabus"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/super-admin/syllabuses")}
            className="cancel-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
