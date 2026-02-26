export default function AdminPage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Manage courses, enrollments, and school operations.</p>
      <div style={{ marginTop: '2rem' }}>
        <h2>Quick Actions</h2>
        <ul>
          <li>Create courses from syllabuses</li>
          <li>Approve student enrollments</li>
          <li>Assign instructors to courses</li>
          <li>View school reports</li>
        </ul>
      </div>
    </div>
  );
}
