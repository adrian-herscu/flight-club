import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { NavShell } from '@/components/NavShell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'School Management System',
  description: 'Multi-tenant SaaS for managing courses, enrollments, and evaluations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NavShell>{children}</NavShell>
      </body>
    </html>
  );
}
