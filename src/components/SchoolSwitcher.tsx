"use client";

import { useSchool } from "@/services/schoolContext";

export function SchoolSwitcher() {
  const { currentSchool, schools, setCurrentSchool, loading } = useSchool();

  if (loading) {
    return <div className="school-switcher">Loading schools...</div>;
  }

  if (schools.length === 0) {
    return null;
  }

  if (schools.length === 1) {
    return <div className="school-switcher-single">{schools[0].name}</div>;
  }

  return (
    <div className="school-switcher">
      <label htmlFor="school-select" className="school-switcher-label">
        Current School:
      </label>
      <select
        id="school-select"
        value={currentSchool?.id || ""}
        onChange={(e) => {
          const school = schools.find((s) => s.id === Number(e.target.value));
          if (school) setCurrentSchool(school);
        }}
        className="school-switcher-select"
      >
        {schools.map((school) => (
          <option key={school.id} value={school.id}>
            {school.name}
          </option>
        ))}
      </select>
    </div>
  );
}
