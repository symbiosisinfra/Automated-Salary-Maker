"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  FileText,
  Briefcase,
  Settings,
  Home,
  LogOut,
  X,
  IndianRupee,
  Users,
  Bell,
} from "lucide-react";

interface AsideNavigationProps {
  currentPath: string;
  userRole: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AsideNavigation({
  currentPath,
  isOpen,
  onClose,
}: AsideNavigationProps) {
  const router = useRouter();

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      // For dashboard, only be active when exactly on the dashboard page
      return currentPath === "/dashboard";
    }
    // For other routes, check if currentPath matches or starts with the path
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    onClose();
  }, [currentPath, onClose]);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transition-transform transform lg:translate-x-0 lg:static lg:inset-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Navigation links - All links in one section at the top */}
          <nav className="flex-1 px-3 py-5 overflow-y-auto">
            <div className="mb-2">
              <div className="mb-2 px-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Main Navigation
                </h3>
              </div>

              <ul className="space-y-1">
                <li>
                  <Link
                    href="/dashboard"
                    className={`flex items-center px-3 py-2.5 rounded-md font-medium ${
                      isActive("/dashboard")
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Home className="w-5 h-5 mr-3" />
                    Dashboard
                  </Link>
                </li>

                {/* Careers management */}
                <li>
                  <Link
                    href="/dashboard/careers"
                    className={`flex items-center px-3 py-2.5 rounded-md font-medium ${
                      isActive("/dashboard/careers")
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Briefcase className="w-5 h-5 mr-3" />
                    Careers
                  </Link>
                </li>

                {/* Salary management */}
                <li>
                  <Link
                    href="/dashboard/salary"
                    className={`flex items-center px-3 py-2.5 rounded-md font-medium ${
                      isActive("/dashboard/salary")
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <IndianRupee className="w-5 h-5 mr-3" />
                    Salary
                  </Link>
                </li>

                {/* Additional navigation items */}
                <li>
                  <Link
                    href="/dashboard/employees"
                    className={`flex items-center px-3 py-2.5 rounded-md font-medium ${
                      isActive("/dashboard/employees")
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Users className="w-5 h-5 mr-3" />
                    Employees
                  </Link>
                </li>

                <li>
                  <Link
                    href="/dashboard/reports"
                    className={`flex items-center px-3 py-2.5 rounded-md font-medium ${
                      isActive("/dashboard/reports")
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <FileText className="w-5 h-5 mr-3" />
                    Reports
                  </Link>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <div className="mb-2 px-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  System
                </h3>
              </div>

              <ul className="space-y-1">
                <li>
                  <Link
                    href="/dashboard/notifications"
                    className={`flex items-center px-3 py-2.5 rounded-md font-medium ${
                      isActive("/dashboard/notifications")
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Bell className="w-5 h-5 mr-3" />
                    Notifications
                  </Link>
                </li>

                <li>
                  <Link
                    href="/dashboard/settings"
                    className={`flex items-center px-3 py-2.5 rounded-md font-medium ${
                      isActive("/dashboard/settings")
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Settings className="w-5 h-5 mr-3" />
                    Settings
                  </Link>
                </li>

                {/* Logout button */}
                <li>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center w-full px-3 py-2.5 rounded-md font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
