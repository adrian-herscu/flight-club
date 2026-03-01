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
  finalized_at: string | null;
}

export default function AdminSyllabusesPage() {
  const router = useRouter();
  const { data, loading, error } = useApiData<{ items: Syllabus[] }>("/api/v1/syllabuses");
  const syllabuses = data?.items || [];

  const handleCreateCourse = (syllabusId: number) => {
    router.push(`/admin/courses/new?syllabus=${syllabusId}`);
  };

  if (loading) return <div>Loading syllabuses...</div>;
  if (error) return <div className="error-text">Error: {error}</div>;

  return (
    <div className="p-2xl">
      <h1 className="page-title">Browse Syllabuses</h1>
      <p className="muted-text">Select a syllabus to create a new course for your school.</p>

      {syllabuses.length === 0 ? (
        <p>No syllabuses available. Contact a super-admin to create syllabuses.</p>
      ) : (
        <div className="card-grid">
          {syllabuses.map((syllabus) => (
            <div key={syllabus.id} className="card">
              <h3 className="card-title">{syllabus.title}</h3>
              {syllabus.description && (
                <p style={{ marginBottom: "1rem", color: "#666" }}>{syllabus.description}</p>
              )}
              <div className="meta-row" style={{ marginBottom: "1rem" }}>
                <div>
                  <strong>Lessons:</strong> {syllabus.lesson_count}
                </div>
                <div>
                  <strong>Version:</strong> v{syllabus.version}
                </div>
                {syllabus.finalized_at && (
                  <div>
                    <strong>Finalized:</strong>{" "}
                    {new Date(syllabus.finalized_at).toLocaleDateString()}
                  </div>
                )}
              </div>
              <button onClick={() => handleCreateCourse(syllabus.id)} className="btn btn-primary">
                Create Course from This Syllabus
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
