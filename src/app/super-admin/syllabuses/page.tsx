"use client";

import { useRouter } from "next/navigation";
import { useApiData } from "@/lib/hooks/useApiData";

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
  const { data: syllabuses, loading, error } = useApiData<Syllabus[]>("/api/v1/syllabuses");

  const handleCreateNew = () => {
    router.push("/super-admin/syllabuses/new");
  };

  const handleView = (id: number) => {
    router.push(`/super-admin/syllabuses/${id}`);
  };

  if (loading) return <div>Loading syllabuses...</div>;
  if (error) return <div className="error-text">Error: {error}</div>;

  return (
    <div className="p-2xl">
      <div className="header-row">
        <h1>Manage Syllabuses</h1>
        <button onClick={handleCreateNew} className="btn btn-primary">
          Create New Syllabus
        </button>
      </div>

      {!syllabuses || syllabuses.length === 0 ? (
        <p>No syllabuses created yet. Create your first syllabus to get started.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-bottom-thick">
              <th className="px-md text-left">Title</th>
              <th className="px-md text-left">Status</th>
              <th className="px-md text-left">Version</th>
              <th className="px-md text-left">Lessons</th>
              <th className="px-md text-left">Created</th>
              <th className="px-md text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {syllabuses.map((syllabus) => (
              <tr key={syllabus.id} className="border-bottom-light">
                <td className="px-md">
                  <strong>{syllabus.title}</strong>
                  {syllabus.description && (
                    <div className="text-muted text-small mt-sm">{syllabus.description}</div>
                  )}
                </td>
                <td className="px-md">
                  <span
                    className="badge"
                    style={{ background: syllabus.status === "final" ? "#34a853" : "#FFA500" }}
                  >
                    {syllabus.status}
                  </span>
                </td>
                <td className="px-md">v{syllabus.version}</td>
                <td className="px-md">{syllabus.lesson_count}</td>
                <td className="px-md">{new Date(syllabus.created_at).toLocaleDateString()}</td>
                <td className="px-md">
                  <button
                    onClick={() => handleView(syllabus.id)}
                    className="btn btn-secondary btn-small"
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
