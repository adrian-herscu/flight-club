"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiClient } from "@/services/apiClient";

interface Lesson {
  id: number;
  title: string;
  description: string | null;
  order: number;
}

interface Syllabus {
  id: number;
  title: string;
  description: string | null;
  status: string;
  version: number;
  createdAt: string;
  finalizedAt: string | null;
  lessons: Lesson[];
}

export default function SyllabusDetailPage() {
  const router = useRouter();
  const params = useParams();
  const syllabusId = params.id as string;

  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit syllabus state
  const [isEditingSyllabus, setIsEditingSyllabus] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Add lesson state
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDescription, setNewLessonDescription] = useState("");

  // Edit lesson state
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState("");
  const [editLessonDescription, setEditLessonDescription] = useState("");

  useEffect(() => {
    if (syllabusId) fetchSyllabus();
  }, [syllabusId]);

  const fetchSyllabus = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Syllabus>(`/api/v1/syllabuses/${syllabusId}`);
      setSyllabus(data);
      setEditTitle(data.title);
      setEditDescription(data.description || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load syllabus");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSyllabus = async () => {
    if (!syllabus) return;
    setSaving(true);
    try {
      await apiClient.patch(`/api/v1/syllabuses/${syllabusId}`, {
        title: editTitle,
        description: editDescription || undefined,
      });
      await fetchSyllabus();
      setIsEditingSyllabus(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save syllabus");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!syllabus) return;
    if (
      !confirm(
        "Publish this syllabus? Once published it becomes immutable and available for schools to use.",
      )
    )
      return;
    setSaving(true);
    try {
      await apiClient.post(`/api/v1/syllabuses/${syllabusId}/publish`, {});
      await fetchSyllabus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish syllabus");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLesson = async () => {
    if (!newLessonTitle.trim()) return;
    const nextOrder = (syllabus?.lessons.length ?? 0) + 1;
    setSaving(true);
    try {
      // Route: /api/v1/syllabuses/[id]/[syllabusId]/lessons
      await apiClient.post(`/api/v1/syllabuses/${syllabusId}/${syllabusId}/lessons`, {
        title: newLessonTitle.trim(),
        description: newLessonDescription.trim() || undefined,
        order: nextOrder,
      });
      setNewLessonTitle("");
      setNewLessonDescription("");
      setShowAddLesson(false);
      await fetchSyllabus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add lesson");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLesson = async (lessonId: number) => {
    setSaving(true);
    try {
      await apiClient.patch(`/api/v1/lessons/${lessonId}`, {
        title: editLessonTitle.trim(),
        description: editLessonDescription.trim() || undefined,
      });
      setEditingLessonId(null);
      await fetchSyllabus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save lesson");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async (lessonId: number, lessonTitle: string) => {
    if (!confirm(`Delete lesson "${lessonTitle}"? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await apiClient.delete(`/api/v1/lessons/${lessonId}`);
      await fetchSyllabus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete lesson");
    } finally {
      setSaving(false);
    }
  };

  const startEditLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setEditLessonTitle(lesson.title);
    setEditLessonDescription(lesson.description || "");
  };

  const isDraft = syllabus?.status === "DRAFT";

  if (loading) return <div>Loading syllabus...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;
  if (!syllabus) return <div>Syllabus not found</div>;

  return (
    <div>
      {/* Back nav */}
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

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
        }}
      >
        <div>
          <div
            style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}
          >
            <h1 style={{ margin: 0 }}>{syllabus.title}</h1>
            <span
              style={{
                padding: "0.25rem 0.75rem",
                borderRadius: "12px",
                fontSize: "0.875rem",
                background: syllabus.status === "FINAL" ? "#e8f5e9" : "#fff3e0",
                color: syllabus.status === "FINAL" ? "#2e7d32" : "#e65100",
              }}
            >
              {syllabus.status} v{syllabus.version}
            </span>
          </div>
          {syllabus.description && (
            <p style={{ color: "#666", margin: 0 }}>{syllabus.description}</p>
          )}
          {syllabus.finalizedAt && (
            <p style={{ color: "#888", fontSize: "0.875rem", margin: "0.25rem 0 0 0" }}>
              Published: {new Date(syllabus.finalizedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          {isDraft && (
            <button
              onClick={() => setIsEditingSyllabus(true)}
              style={{
                padding: "0.5rem 1rem",
                background: "#1976d2",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Edit Details
            </button>
          )}
          {isDraft && syllabus.lessons.length > 0 && (
            <button
              onClick={handlePublish}
              disabled={saving}
              style={{
                padding: "0.5rem 1rem",
                background: saving ? "#ccc" : "#34a853",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              {saving ? "Publishing..." : "Publish Syllabus"}
            </button>
          )}
        </div>
      </div>

      {/* Edit syllabus form */}
      {isEditingSyllabus && (
        <div
          style={{
            background: "#f9f9f9",
            padding: "1.5rem",
            borderRadius: "8px",
            marginBottom: "2rem",
            border: "1px solid #ddd",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Edit Syllabus Details</h3>
          <div style={{ display: "grid", gap: "1rem", maxWidth: "600px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
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
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
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
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={handleSaveSyllabus}
                disabled={saving || !editTitle.trim()}
                style={{
                  padding: "0.5rem 1.5rem",
                  background: saving ? "#ccc" : "#1976d2",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setIsEditingSyllabus(false)}
                style={{
                  padding: "0.5rem 1.5rem",
                  background: "#f5f5f5",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info banner for FINAL syllabuses */}
      {!isDraft && (
        <div
          style={{
            padding: "1rem",
            background: "#e8f5e9",
            borderRadius: "8px",
            marginBottom: "2rem",
            border: "1px solid #c8e6c9",
          }}
        >
          <strong style={{ color: "#2e7d32" }}>✓ Published Syllabus</strong>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#388e3c" }}>
            This syllabus is published and immutable. Schools can create courses from it. To make
            changes, create a new version.
          </p>
        </div>
      )}

      {/* Lessons */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ margin: 0 }}>Lessons ({syllabus.lessons.length})</h2>
          {isDraft && (
            <button
              onClick={() => setShowAddLesson(true)}
              style={{
                padding: "0.5rem 1rem",
                background: "#4285f4",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              + Add Lesson
            </button>
          )}
        </div>

        {syllabus.lessons.length === 0 ? (
          <p style={{ color: "#888", fontStyle: "italic" }}>
            No lessons yet. Add at least one lesson before publishing.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {syllabus.lessons
              .sort((a, b) => a.order - b.order)
              .map((lesson) => (
                <div
                  key={lesson.id}
                  style={{
                    padding: "1.25rem",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    background: "white",
                  }}
                >
                  {editingLessonId === lesson.id ? (
                    <div style={{ display: "grid", gap: "0.75rem" }}>
                      <input
                        type="text"
                        value={editLessonTitle}
                        onChange={(e) => setEditLessonTitle(e.target.value)}
                        style={{
                          padding: "0.5rem",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "1rem",
                        }}
                      />
                      <textarea
                        value={editLessonDescription}
                        onChange={(e) => setEditLessonDescription(e.target.value)}
                        rows={2}
                        placeholder="Description (optional)"
                        style={{
                          padding: "0.5rem",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "0.875rem",
                          fontFamily: "inherit",
                        }}
                      />
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleSaveLesson(lesson.id)}
                          disabled={saving}
                          style={{
                            padding: "0.4rem 1rem",
                            background: "#34a853",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingLessonId(null)}
                          style={{
                            padding: "0.4rem 1rem",
                            background: "#f5f5f5",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span style={{ fontWeight: 600, color: "#888", fontSize: "0.875rem" }}>
                            #{lesson.order}
                          </span>
                          <strong style={{ fontSize: "1rem" }}>{lesson.title}</strong>
                        </div>
                        {lesson.description && (
                          <p
                            style={{ margin: "0.25rem 0 0 0", color: "#666", fontSize: "0.875rem" }}
                          >
                            {lesson.description}
                          </p>
                        )}
                      </div>
                      {isDraft && (
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            flexShrink: 0,
                            marginLeft: "1rem",
                          }}
                        >
                          <button
                            onClick={() => startEditLesson(lesson)}
                            style={{
                              padding: "0.35rem 0.75rem",
                              background: "#1976d2",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                            style={{
                              padding: "0.35rem 0.75rem",
                              background: "#d32f2f",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Add lesson inline form */}
        {showAddLesson && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1.25rem",
              border: "2px dashed #4285f4",
              borderRadius: "8px",
              background: "#f8f9ff",
            }}
          >
            <h4 style={{ margin: "0 0 1rem 0", color: "#1976d2" }}>
              New Lesson #{syllabus.lessons.length + 1}
            </h4>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <input
                type="text"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                placeholder="Lesson title *"
                autoFocus
                style={{
                  padding: "0.625rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "1rem",
                }}
              />
              <textarea
                value={newLessonDescription}
                onChange={(e) => setNewLessonDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                style={{
                  padding: "0.625rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "0.875rem",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={handleAddLesson}
                  disabled={saving || !newLessonTitle.trim()}
                  style={{
                    padding: "0.5rem 1.25rem",
                    background: saving ? "#ccc" : "#4285f4",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Adding..." : "Add Lesson"}
                </button>
                <button
                  onClick={() => {
                    setShowAddLesson(false);
                    setNewLessonTitle("");
                    setNewLessonDescription("");
                  }}
                  style={{
                    padding: "0.5rem 1.25rem",
                    background: "#f5f5f5",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
