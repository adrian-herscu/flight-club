'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/services/apiClient';
import type { UserMe } from '@/services/types';

interface RoleGateProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
}

export function RoleGate({ children, allowedRoles, fallback }: RoleGateProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const data = await apiClient.get<UserMe>('/api/v1/me');
        setUser(data);

        // Check if user has any of the allowed roles
        const hasAllowedRole = data.roles.some(role => 
          allowedRoles.includes(role)
        );

        if (!hasAllowedRole) {
          // Redirect to appropriate page based on user's role
          if (data.roles.includes('super_admin')) {
            router.push('/super-admin');
          } else if (data.roles.includes('admin')) {
            router.push('/admin');
          } else if (data.roles.includes('instructor')) {
            router.push('/instructor');
          } else if (data.roles.includes('student')) {
            router.push('/student');
          } else {
            router.push('/');
          }
        }
      } catch (error) {
        console.error('Failed to check role:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [allowedRoles, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || !user.roles.some(role => allowedRoles.includes(role))) {
    return fallback || <div>Access denied</div>;
  }

  return <>{children}</>;
}
