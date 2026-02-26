'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/services/apiClient';
import type { UserMe } from '@/services/types';

export default function HomePage() {
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await apiClient.get<UserMe>('/api/v1/me');
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Welcome to School Management System</h1>
      {user && (
        <div style={{ marginTop: '2rem' }}>
          <h2>User Profile</h2>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Name:</strong> {user.name || 'N/A'}</p>
          <p><strong>Roles:</strong> {user.roles.length > 0 ? user.roles.join(', ') : 'None assigned'}</p>
        </div>
      )}
      <div style={{ marginTop: '2rem' }}>
        <p>Use the navigation menu to access different sections based on your role.</p>
      </div>
    </div>
  );
}
