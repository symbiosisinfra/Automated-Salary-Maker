"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

interface AsideNavigationProps {
  currentPath: string;
  userRole: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AsideNavigation({
  currentPath,
  userRole,
  isOpen,
  onClose,
}: AsideNavigationProps) {
  const router = useRouter();

  const isActive = (path: string) => {
    return currentPath === path;
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
          {/* Logo and mobile close button */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-gray-700" />
              </div>
              <span className="ml-2 font-semibold text-gray-900">
                Dashboard
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 px-2 py-4 overflow-y-auto">
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

              {/* Logout button */}
              <div className="pt-4 mt-4 border-t">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center w-full px-3 py-2.5 rounded-md font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </button>
              </div>
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}
