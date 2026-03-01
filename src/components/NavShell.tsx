"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ReactNode, useState, useEffect } from "react";
import { SchoolProvider } from "@/services/schoolContext";
import { SchoolSwitcher } from "./SchoolSwitcher";
import { UserProfile } from "./UserProfile";

interface NavShellProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  roles: string[]; // Which roles can see this item
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", roles: ["super_admin", "school_admin", "instructor", "student"] },
  { label: "Super Admin", href: "/super-admin", roles: ["super_admin"] },
  { label: "Admin", href: "/admin", roles: ["school_admin"] },
  { label: "Instructor", href: "/instructor", roles: ["instructor"] },
  { label: "Student", href: "/student", roles: ["student"] },
];

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
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user roles on mount
  useEffect(() => {
    // Skip fetching roles on auth pages
    if (pathname?.startsWith("/login") || pathname?.startsWith("/logout")) {
      setLoading(false);
      return;
    }

    const fetchUserRoles = async () => {
      try {
        const isDevMode = typeof window !== "undefined" && localStorage.getItem("dev-mode") === "true";
        
        if (isDevMode) {
          // In dev mode, fetch from API with dev token
          const devUserEmail = localStorage.getItem("dev-user-email") || "dev@local.com";
          const devUserName = localStorage.getItem("dev-user-name") || "Dev User";
          const devUserRole = localStorage.getItem("dev-user-role") || "super-admin";

          const response = await fetch("/api/v1/me", {
            headers: {
              Authorization: "Bearer dev-mode-local-testing-token",
              "x-dev-user-email": devUserEmail,
              "x-dev-user-name": devUserName,
              "x-dev-user-role": devUserRole,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUserRoles(data.data?.roles || []);
          }
        } else {
          // In production, fetch with real token
          // TODO: Implement Supabase token retrieval
          const response = await fetch("/api/v1/me");
          if (response.ok) {
            const data = await response.json();
            setUserRoles(data.data?.roles || []);
          }
        }
      } catch (error) {
        console.error("Error fetching user roles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRoles();
  }, [pathname]);

  // Don't show nav on auth pages
  if (pathname?.startsWith("/login") || pathname?.startsWith("/logout")) {
    return <>{children}</>;
  }

  // Filter nav items based on user roles
  const visibleNavItems = NAV_ITEMS.filter((item) =>
    item.roles.some((role) => userRoles.includes(role))
  );

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
              {!loading && visibleNavItems.map((item) => (
                <li key={item.href} className="nav-list-item">
                  <Link
                    href={item.href}
                    className="nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
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
