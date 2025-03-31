"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { Menu, Bell, User, Settings, LogOut, ChevronDown } from "lucide-react";

interface HeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
  onMenuToggle: () => void;
}

export default function Header({ user, onMenuToggle }: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  return (
    <header className="bg-white border-b h-16 flex items-center justify-between px-4 lg:px-6">
      {/* Left side - logo and mobile menu button */}
      <div className="flex items-center">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-md lg:hidden hover:bg-gray-100"
        >
          <Menu className="w-6 h-6 text-gray-500" />
        </button>

        {/* Logo and title */}
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Company Logo"
            width={32}
            height={32}
            className="mr-2"
          />
          <h1 className="text-xl font-semibold text-gray-800 hidden md:block">
            Symbiosis Infra
          </h1>
        </Link>
      </div>

      {/* Right side - user section */}
      <div className="flex items-center space-x-4">
        <button className="p-1.5 rounded-full hover:bg-gray-100">
          <Bell className="w-5 h-5 text-gray-500" />
        </button>

        <div className="relative">
          <button
            onClick={toggleUserMenu}
            className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-gray-100"
          >
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="hidden md:block text-sm text-left">
              <p className="font-medium text-gray-700">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role || "User"}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
              <div className="px-4 py-2 border-b md:hidden">
                <p className="text-sm font-medium text-gray-700">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>

              <a
                href="#"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <User className="w-4 h-4 mr-2" />
                Your Profile
              </a>

              <a
                href="#"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </a>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
