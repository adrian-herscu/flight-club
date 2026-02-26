'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/services/apiClient';

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
  const [syllabuses, setSyllabuses] = useState<Syllabus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSyllabuses();
  }, []);

  const fetchSyllabuses = async () => {
    try {
      const data = await apiClient.get<{ items: Syllabus[] }>('/api/v1/syllabuses');
      setSyllabuses(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load syllabuses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = (syllabusId: number) => {
    router.push(`/admin/courses/new?syllabus=${syllabusId}`);
  };

  if (loading) return <div>Loading syllabuses...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Browse Syllabuses</h1>
      <p style={{ marginBottom: '2rem', color: '#666' }}>
        Select a syllabus to create a new course for your school.
      </p>

      {syllabuses.length === 0 ? (
        <p>No syllabuses available. Contact a super-admin to create syllabuses.</p>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {syllabuses.map(syllabus => (
            <div
              key={syllabus.id}
              style={{
                padding: '1.5rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: 'white',
              }}
            >
              <h3 style={{ marginTop: 0 }}>{syllabus.title}</h3>
              {syllabus.description && (
                <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  {syllabus.description}
                </p>
              )}
              <div style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                <div><strong>Lessons:</strong> {syllabus.lesson_count}</div>
                <div><strong>Version:</strong> v{syllabus.version}</div>
                {syllabus.finalized_at && (
                  <div><strong>Finalized:</strong> {new Date(syllabus.finalized_at).toLocaleDateString()}</div>
                )}
              </div>
              <button
                onClick={() => handleCreateCourse(syllabus.id)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#4285f4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Create Course from This Syllabus
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
