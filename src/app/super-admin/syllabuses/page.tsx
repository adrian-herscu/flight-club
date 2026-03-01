"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/services/apiClient";

interface Syllabus {
  id: number;
  title: string;
  description: string | null;
  status: string;
  version: number;
  lesson_count: number;
  created_at: string;
  finalized_at: string | null;
}

export default function SuperAdminSyllabusesPage() {
  const router = useRouter();
  const [syllabuses, setSyllabuses] = useState<Syllabus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSyllabuses();
  }, []);

  const fetchSyllabuses = async () => {
    try {
      const data = await apiClient.get<Syllabus[]>("/api/v1/syllabuses");
      setSyllabuses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load syllabuses");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    router.push("/super-admin/syllabuses/new");
  };

  const handleView = (id: number) => {
    router.push(`/super-admin/syllabuses/${id}`);
  };

  if (loading) return <div>Loading syllabuses...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1>Manage Syllabuses</h1>
        <button
          onClick={handleCreateNew}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#4285f4",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Create New Syllabus
        </button>
      </div>

      {syllabuses.length === 0 ? (
        <p>No syllabuses created yet. Create your first syllabus to get started.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "1rem", textAlign: "left" }}>Title</th>
              <th style={{ padding: "1rem", textAlign: "left" }}>Status</th>
              <th style={{ padding: "1rem", textAlign: "left" }}>Version</th>
              <th style={{ padding: "1rem", textAlign: "left" }}>Lessons</th>
              <th style={{ padding: "1rem", textAlign: "left" }}>Created</th>
              <th style={{ padding: "1rem", textAlign: "left" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {syllabuses.map((syllabus) => (
              <tr key={syllabus.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "1rem" }}>
                  <strong>{syllabus.title}</strong>
                  {syllabus.description && (
                    <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
                      {syllabus.description}
                    </div>
                  )}
                </td>
                <td style={{ padding: "1rem" }}>
                  <span
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "12px",
                      fontSize: "0.875rem",
                      background: syllabus.status === "final" ? "#e8f5e9" : "#fff3e0",
                      color: syllabus.status === "final" ? "#2e7d32" : "#e65100",
                    }}
                  >
                    {syllabus.status}
                  </span>
                </td>
                <td style={{ padding: "1rem" }}>v{syllabus.version}</td>
                <td style={{ padding: "1rem" }}>{syllabus.lesson_count}</td>
                <td style={{ padding: "1rem" }}>
                  {new Date(syllabus.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: "1rem" }}>
                  <button
                    onClick={() => handleView(syllabus.id)}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#1976d2",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      marginRight: "0.5rem",
                    }}
                  >
                    View/Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
