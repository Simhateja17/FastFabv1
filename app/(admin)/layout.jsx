"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAdminAuth } from "@/app/context/AdminAuthContext";

// Navigation Item component
const NavItem = ({ href, icon, label, isActive, isSidebarOpen }) => (
  <Link
    href={href}
    className={`flex items-center p-2 rounded-lg hover:bg-background-alt ${
      isActive ? "bg-primary/10 text-primary" : "text-text"
    }`}
  >
    <span className="text-xl">{icon}</span>
    {isSidebarOpen && <span className="ml-3">{label}</span>}
  </Link>
);

// AdminLayout component that wraps all admin pages
export default function AdminRootLayout({ children }) {
  return (
    <div>
      <AdminAuthProvider>
        <AdminLayout>{children}</AdminLayout>
      </AdminAuthProvider>
    </div>
  );
}

// AdminAuthProvider component
import { AdminAuthProvider } from "@/app/context/AdminAuthContext";

// The main layout with sidebar
function AdminLayout({ children }) {
  const { adminUser, loading, isAuthenticated, logout } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Check if user is authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated() && !pathname.includes("/admin-login")) {
      router.push("/admin-login");
    }
  }, [loading, isAuthenticated, pathname, router]);

  // Handle logout
  const handleLogout = () => {
    logout();
    router.push("/admin-login");
  };

  // Skip layout rendering for login page
  if (pathname === "/admin-login") {
    return <>{children}</>;
  }

  // Show loading when checking auth status
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Don't render admin layout if not authenticated
  if (!isAuthenticated() && !pathname.includes("/admin-login")) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`bg-background-card shadow-md transition-all duration-300 ${
          isSidebarOpen ? "w-60" : "w-16"
        } h-screen flex flex-col fixed left-0 top-0 z-10`}
      >
        {/* Logo and toggle */}
        <div className="p-4 flex items-center justify-between border-b border-ui-border">
          {isSidebarOpen && (
            <Link
              href="/superadmin/dashboard"
              className="text-xl font-bold text-primary"
            >
              FastFab
            </Link>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg bg-background hover:bg-background-alt text-text"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
          <NavItem
            href="/superadmin/dashboard"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            }
            label="Dashboard"
            isActive={pathname.includes("/dashboard")}
            isSidebarOpen={isSidebarOpen}
          />
          <NavItem
            href="/superadmin/sellers"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            }
            label="Sellers"
            isActive={pathname.includes("/sellers")}
            isSidebarOpen={isSidebarOpen}
          />
          <NavItem
            href="/superadmin/products"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            }
            label="Products"
            isActive={pathname.includes("/products")}
            isSidebarOpen={isSidebarOpen}
          />
          <NavItem
            href="/superadmin/orders"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
            label="Orders"
            isActive={pathname.includes("/orders")}
            isSidebarOpen={isSidebarOpen}
          />
          <NavItem
            href="/superadmin/users"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            }
            label="Users"
            isActive={pathname.includes("/users")}
            isSidebarOpen={isSidebarOpen}
          />
          <NavItem
            href="/superadmin/returns"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"
                />
              </svg>
            }
            label="Returns & Refunds"
            isActive={pathname.includes("/returns")}
            isSidebarOpen={isSidebarOpen}
          />
          <NavItem
            href="/superadmin/settings"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
            label="Settings"
            isActive={pathname.includes("/settings")}
            isSidebarOpen={isSidebarOpen}
          />
        </nav>

        {/* User and logout */}
        <div className="p-4 border-t border-ui-border">
          {isSidebarOpen ? (
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-text">
                  {adminUser?.name || "Admin"}
                </p>
                <p className="text-xs text-text-muted">
                  {adminUser?.email || "admin@example.com"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-background-alt text-text"
                title="Logout"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-1.5 rounded-lg hover:bg-background-alt text-text flex justify-center"
              title="Logout"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 overflow-x-hidden overflow-y-auto transition-all duration-300 ${
          isSidebarOpen ? "ml-60" : "ml-16"
        }`}
      >
        {/* Header */}
        <header className="bg-background-card shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-text">
                {pathname.split("/").pop()?.charAt(0).toUpperCase() +
                  pathname.split("/").pop()?.slice(1) || "Dashboard"}
              </h1>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
