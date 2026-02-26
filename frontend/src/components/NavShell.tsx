'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ReactNode } from 'react';
import { SchoolProvider } from '@/services/schoolContext';
import { SchoolSwitcher } from './SchoolSwitcher';

interface NavShellProps {
  children: ReactNode;
}

export function NavShell({ children }: NavShellProps) {
  const pathname = usePathname();

  // Don't show nav on auth pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/logout')) {
    return <>{children}</>;
  }

  return (
    <SchoolProvider>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <nav style={{
          width: '200px',
          background: '#f5f5f5',
          padding: '1rem',
          borderRight: '1px solid #ddd'
        }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>School Management</h2>
          
          <SchoolSwitcher />
          
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <Link href="/" style={{ textDecoration: 'none', color: '#333' }}>Home</Link>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <Link href="/super-admin" style={{ textDecoration: 'none', color: '#333' }}>Super Admin</Link>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <Link href="/admin" style={{ textDecoration: 'none', color: '#333' }}>Admin</Link>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <Link href="/instructor" style={{ textDecoration: 'none', color: '#333' }}>Instructor</Link>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <Link href="/student" style={{ textDecoration: 'none', color: '#333' }}>Student</Link>
            </li>
            <li style={{ marginTop: '2rem' }}>
              <Link href="/logout" style={{ textDecoration: 'none', color: '#d32f2f' }}>Logout</Link>
            </li>
          </ul>
        </nav>
        <main style={{ flex: 1, padding: '2rem' }}>
          {children}
        </main>
      </div>
    </SchoolProvider>
  );
}
