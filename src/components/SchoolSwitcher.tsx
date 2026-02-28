'use client';

import { useSchool } from '@/services/schoolContext';

export function SchoolSwitcher() {
  const { currentSchool, schools, setCurrentSchool, loading } = useSchool();

  if (loading) {
    return <div style={{ padding: '0.5rem' }}>Loading schools...</div>;
  }

  if (schools.length === 0) {
    return null;
  }

  if (schools.length === 1) {
    return (
      <div style={{ padding: '0.5rem', fontWeight: 'bold' }}>
        {schools[0].name}
      </div>
    );
  }

  return (
    <div style={{ padding: '0.5rem' }}>
      <label htmlFor="school-select" style={{ display: 'block', marginBottom: '0.25rem' }}>
        Current School:
      </label>
      <select
        id="school-select"
        value={currentSchool?.id || ''}
        onChange={(e) => {
          const school = schools.find(s => s.id === Number(e.target.value));
          if (school) setCurrentSchool(school);
        }}
        style={{
          width: '100%',
          padding: '0.5rem',
          border: '1px solid #ccc',
          borderRadius: '4px',
        }}
      >
        {schools.map(school => (
          <option key={school.id} value={school.id}>
            {school.name}
          </option>
        ))}
      </select>
    </div>
  );
}
