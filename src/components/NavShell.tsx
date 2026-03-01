"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ReactNode, useState } from "react";
import { SchoolProvider } from "@/services/schoolContext";
import { SchoolSwitcher } from "./SchoolSwitcher";
import { UserProfile } from "./UserProfile";

interface NavShellProps {
  children: ReactNode;
}

/**
 * T063 [US12] Responsive navigation shell with mobile support
 *
 * Breakpoints:
 * - Mobile: < 768px (hamburger menu)
 * - Desktop: >= 768px (sidebar navigation)
 */
export function NavShell({ children }: NavShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Don't show nav on auth pages
  if (pathname?.startsWith("/login") || pathname?.startsWith("/logout")) {
    return <>{children}</>;
  }

  return (
    <SchoolProvider>
      <div className="nav-shell">
        {/* Mobile header with hamburger */}
        <div className="nav-mobile-header">
          <h2 className="nav-mobile-title">School Management</h2>
          <button
            className="nav-mobile-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>

        <div className="nav-main">
          {/* Desktop sidebar / Mobile overlay menu */}
          <nav className={`nav-sidebar${mobileMenuOpen ? " nav-open" : ""}`}>
            <h2 className="nav-mobile-title desktop-only">School Management</h2>

            <SchoolSwitcher />

            <ul className="nav-list">
              <li className="nav-list-item">
                <Link href="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Home
                </Link>
              </li>
              <li className="nav-list-item">
                <Link
                  href="/super-admin"
                  className="nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Super Admin
                </Link>
              </li>
              <li className="nav-list-item">
                <Link href="/admin" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Admin
                </Link>
              </li>
              <li className="nav-list-item">
                <Link
                  href="/instructor"
                  className="nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Instructor
                </Link>
              </li>
              <li className="nav-list-item">
                <Link href="/student" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Student
                </Link>
              </li>
              <li className="nav-list-item-separator">
                <Link
                  href="/logout"
                  className="nav-link-logout"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Logout
                </Link>
              </li>
            </ul>

            {/* User profile section */}
            <UserProfile />
          </nav>

          <main className="main-content">{children}</main>
        </div>
      </div>
    </SchoolProvider>
  );
}
