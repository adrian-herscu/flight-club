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
      <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
        {/* Mobile header with hamburger */}
        <div
          style={{
            display: "none",
            padding: "1rem",
            background: "#f5f5f5",
            borderBottom: "1px solid #ddd",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          className="mobile-header"
        >
          <h2 style={{ fontSize: "1.2rem", margin: 0 }}>School Management</h2>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "0.5rem",
            }}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>

        <div style={{ display: "flex", flex: 1 }}>
          {/* Desktop sidebar / Mobile overlay menu */}
          <nav
            style={{
              width: "200px",
              background: "#f5f5f5",
              padding: "1rem",
              borderRight: "1px solid #ddd",
              position: "relative",
            }}
            className={mobileMenuOpen ? "nav-open" : ""}
          >
            <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }} className="desktop-only">
              School Management
            </h2>

            <SchoolSwitcher />

            <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>
                <Link
                  href="/"
                  style={{
                    textDecoration: "none",
                    color: "#333",
                    display: "block",
                    padding: "0.5rem",
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <Link
                  href="/super-admin"
                  style={{
                    textDecoration: "none",
                    color: "#333",
                    display: "block",
                    padding: "0.5rem",
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Super Admin
                </Link>
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <Link
                  href="/admin"
                  style={{
                    textDecoration: "none",
                    color: "#333",
                    display: "block",
                    padding: "0.5rem",
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin
                </Link>
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <Link
                  href="/instructor"
                  style={{
                    textDecoration: "none",
                    color: "#333",
                    display: "block",
                    padding: "0.5rem",
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Instructor
                </Link>
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <Link
                  href="/student"
                  style={{
                    textDecoration: "none",
                    color: "#333",
                    display: "block",
                    padding: "0.5rem",
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Student
                </Link>
              </li>
              <li style={{ marginTop: "2rem" }}>
                <Link
                  href="/logout"
                  style={{
                    textDecoration: "none",
                    color: "#d32f2f",
                    display: "block",
                    padding: "0.5rem",
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Logout
                </Link>
              </li>
            </ul>

            {/* User profile section */}
            <UserProfile />
          </nav>

          <main style={{ flex: 1, padding: "1rem" }} className="main-content">
            {children}
          </main>
        </div>
      </div>

      {/* Responsive styles */}
      <style jsx>{`
        /* Desktop styles (default) */
        .mobile-header {
          display: none;
        }

        .desktop-only {
          display: block;
        }

        nav {
          display: block;
        }

        .main-content {
          padding: 2rem;
        }

        /* Mobile styles */
        @media (max-width: 768px) {
          .mobile-header {
            display: flex !important;
          }

          .desktop-only {
            display: none;
          }

          nav {
            position: fixed;
            top: 0;
            left: -250px;
            height: 100vh;
            width: 250px;
            z-index: 1000;
            transition: left 0.3s ease;
            overflow-y: auto;
          }

          nav.nav-open {
            left: 0;
            box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
          }

          .main-content {
            padding: 1rem;
            width: 100%;
          }

          /* Touch-friendly tap targets on mobile */
          nav a {
            padding: 1rem 0.5rem !important;
            min-height: 44px;
            display: flex;
            align-items: center;
          }
        }

        /* Tablet styles */
        @media (min-width: 769px) and (max-width: 1024px) {
          .main-content {
            padding: 1.5rem;
          }
        }
      `}</style>
    </SchoolProvider>
  );
}
