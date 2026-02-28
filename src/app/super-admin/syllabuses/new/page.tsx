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
      <button
        onClick={() => router.push("/super-admin/syllabuses")}
        style={{
          padding: "0.5rem 1rem",
          background: "#f5f5f5",
          border: "1px solid #ddd",
          borderRadius: "4px",
          cursor: "pointer",
          marginBottom: "1.5rem",
        }}
      >
        ← Back to Syllabuses
      </button>

      <h1 style={{ marginBottom: "0.5rem" }}>Create New Syllabus</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        A syllabus defines the lesson structure for a training programme. After creating it, add
        lessons, then publish it to make it available for schools to use.
      </p>

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

      <form onSubmit={handleSubmit} style={{ maxWidth: "560px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
            Title <span style={{ color: "#d32f2f" }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. P2 Paragliding Certification"
            required
            autoFocus
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

        <div style={{ marginBottom: "2rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what this syllabus covers"
            rows={4}
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

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            style={{
              padding: "0.75rem 2rem",
              background: saving || !title.trim() ? "#ccc" : "#4285f4",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: saving || !title.trim() ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontWeight: 500,
            }}
          >
            {saving ? "Creating..." : "Create Syllabus"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/super-admin/syllabuses")}
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
