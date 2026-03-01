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

  const [isEditingSyllabus, setIsEditingSyllabus] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [showAddLesson, setShowAddLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDescription, setNewLessonDescription] = useState("");

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
    ) {
      return;
    }
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

  const handleCreateNewVersion = async () => {
    if (!syllabus) return;
    if (
      !confirm(
        `Create a new draft version (v${(syllabus.version || 1) + 1}) from this final syllabus? The new draft will copy all lessons.`,
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const newDraft = await apiClient.post<Syllabus>(
        `/api/v1/syllabuses/${syllabusId}/create-version`,
        {},
      );
      // Navigate to the new draft
      router.push(`/super-admin/syllabuses/${newDraft.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create new version");
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
  if (error) return <div className="error-text">Error: {error}</div>;
  if (!syllabus) return <div>Syllabus not found</div>;

  return (
    <div>
      <button onClick={() => router.push("/super-admin/syllabuses")} className="back-button">
        ← Back to Syllabuses
      </button>

      <div className="header-section">
        <div>
          <div className="header-row">
            <h1 className="page-title">{syllabus.title}</h1>
            <span
              className={`badge badge-large ${
                syllabus.status === "FINAL" ? "status-final" : "status-draft"
              }`}
            >
              {syllabus.status} v{syllabus.version}
            </span>
          </div>
          {syllabus.description && <p className="muted-paragraph">{syllabus.description}</p>}
          {syllabus.finalizedAt && (
            <p className="muted-text">
              Published: {new Date(syllabus.finalizedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="header-row" style={{ gap: "var(--spacing-md)" }}>
          {isDraft && (
            <button onClick={() => setIsEditingSyllabus(true)} className="btn btn-primary">
              Edit Details
            </button>
          )}
          {isDraft && syllabus.lessons.length > 0 && (
            <button onClick={handlePublish} disabled={saving} className="btn btn-success">
              {saving ? "Publishing..." : "Publish Syllabus"}
            </button>
          )}
        </div>
      </div>

      {isEditingSyllabus && (
        <div className="edit-panel">
          <h3 className="section-title">Edit Syllabus Details</h3>
          <div className="edit-grid">
            <div className="field-group">
              <label className="field-label">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="field-input"
              />
            </div>
            <div className="field-group">
              <label className="field-label">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="field-textarea"
              />
            </div>
            <div className="form-actions">
              <button
                onClick={handleSaveSyllabus}
                disabled={saving || !editTitle.trim()}
                className="submit-button"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setIsEditingSyllabus(false)} className="cancel-button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {!isDraft && (
        <div className="info-banner">
          <strong className="info-text">✓ Published Syllabus</strong>
          <p className="info-text">
            This syllabus is published and immutable. Schools can create courses from it. To make
            changes, create a new version.
          </p>
          <button
            onClick={handleCreateNewVersion}
            disabled={saving}
            className="btn btn-primary"
            style={{ marginTop: "var(--spacing-md)" }}
          >
            {saving ? "Creating..." : "Create New Version"}
          </button>
        </div>
      )}

      <div>
        <div className="lessons-section">
          <h2 className="lessons-title">Lessons ({syllabus.lessons.length})</h2>
          {isDraft && (
            <button onClick={() => setShowAddLesson(true)} className="btn btn-primary">
              + Add Lesson
            </button>
          )}
        </div>

        {syllabus.lessons.length === 0 ? (
          <p className="empty-lessons">
            No lessons yet. Add at least one lesson before publishing.
          </p>
        ) : (
          <div className="lessons-grid">
            {syllabus.lessons
              .sort((a, b) => a.order - b.order)
              .map((lesson) => (
                <div key={lesson.id} className="card">
                  {editingLessonId === lesson.id ? (
                    <div className="edit-grid">
                      <input
                        type="text"
                        value={editLessonTitle}
                        onChange={(e) => setEditLessonTitle(e.target.value)}
                        className="field-input"
                      />
                      <textarea
                        value={editLessonDescription}
                        onChange={(e) => setEditLessonDescription(e.target.value)}
                        rows={2}
                        placeholder="Description (optional)"
                        className="field-textarea"
                      />
                      <div className="form-actions">
                        <button
                          onClick={() => handleSaveLesson(lesson.id)}
                          disabled={saving}
                          className="submit-button"
                        >
                          Save
                        </button>
                        <button onClick={() => setEditingLessonId(null)} className="cancel-button">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="card-body">
                      <div className="header-row">
                        <div>
                          <div className="header-row">
                            <span className="badge"># {lesson.order}</span>
                            <strong className="card-title">{lesson.title}</strong>
                          </div>
                          {lesson.description && <p className="muted-text">{lesson.description}</p>}
                        </div>
                        {isDraft && (
                          <div className="header-row" style={{ gap: "var(--spacing-sm)" }}>
                            <button
                              onClick={() => startEditLesson(lesson)}
                              className="btn btn-primary"
                              style={{
                                fontSize: "0.85rem",
                                padding: "var(--spacing-xs) var(--spacing-md)",
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                              className="btn btn-danger"
                              style={{
                                fontSize: "0.85rem",
                                padding: "var(--spacing-xs) var(--spacing-md)",
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {showAddLesson && (
          <div className="add-lesson-panel">
            <h4 className="add-lesson-title">New Lesson #{syllabus.lessons.length + 1}</h4>
            <div className="add-lesson-grid">
              <input
                type="text"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                placeholder="Lesson title *"
                autoFocus
                className="field-input"
              />
              <textarea
                value={newLessonDescription}
                onChange={(e) => setNewLessonDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="field-textarea"
              />
              <div className="add-lesson-actions">
                <button
                  onClick={handleAddLesson}
                  disabled={saving || !newLessonTitle.trim()}
                  className="add-lesson-submit"
                >
                  {saving ? "Adding..." : "Add Lesson"}
                </button>
                <button
                  onClick={() => {
                    setShowAddLesson(false);
                    setNewLessonTitle("");
                    setNewLessonDescription("");
                  }}
                  className="add-lesson-cancel"
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
