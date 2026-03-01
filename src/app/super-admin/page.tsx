import Link from "next/link";

export default function SuperAdminPage() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Super Admin Dashboard</h1>
      <p>Manage syllabuses and system-wide settings.</p>
      <div style={{ marginTop: "2rem" }}>
        <h2>Quick Actions</h2>
        <ul>
          <li>
            <Link href="/super-admin/syllabuses">Create and manage syllabuses</Link>
          </li>
          <li>
            <Link href="/super-admin/schools">View all schools</Link>
          </li>
          <li>
            <Link href="/super-admin/users">Manage system users</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
