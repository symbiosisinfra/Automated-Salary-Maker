// app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  TrendingUp,
  Users,
  Briefcase,
  IndianRupee,
  Clock,
  Calendar,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { CareerApplication } from "@/app/api/careers/route";

export default function Dashboard() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [careerApplications, setCareerApplications] = useState<
    CareerApplication[]
  >([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [monthlyPayroll, setMonthlyPayroll] = useState("");
  const [attendanceRate, setAttendanceRate] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch career applications
        const careersResponse = await fetch("/api/careers");
        if (!careersResponse.ok) {
          throw new Error("Failed to fetch career applications");
        }
        const careersData = await careersResponse.json();
        setCareerApplications(careersData);

        // Fetch additional dashboard metrics (mock data for now)
        // In a real application, you'd have separate API endpoints for these
        setTotalEmployees(42);
        setMonthlyPayroll("₹285,400");
        setAttendanceRate("94.5%");

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <section className="bg-white rounded-lg shadow-md p-6 border">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome back, {session?.user?.name}!
        </h1>
        <p className="mt-2 text-gray-600">
          Here's what's happening with Symbiosis Infra Private Limited today.
        </p>
      </section>

      {/* Statistics cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Employees"
          value={totalEmployees.toString()}
          change="+2"
          period="from last month"
          icon={<Users className="w-7 h-7 text-purple-600" />}
          linkTo="/dashboard/salary"
        />
        <StatCard
          title="Job Applications"
          value={careerApplications.length.toString()}
          change={`+${
            careerApplications.filter(
              (app) =>
                new Date(app.createdAt).getMonth() === new Date().getMonth()
            ).length
          }`}
          period="from this month"
          icon={<Briefcase className="w-7 h-7 text-purple-600" />}
          linkTo="/dashboard/careers"
        />
        <StatCard
          title="Monthly Payroll"
          value={monthlyPayroll}
          change="-3%"
          period="from last month"
          icon={<IndianRupee className="w-7 h-7 text-green-600" />}
          linkTo="/dashboard/salary"
        />
        <StatCard
          title="Attendance Rate"
          value={attendanceRate}
          change="+2.1%"
          period="from last month"
          icon={<Clock className="w-7 h-7 text-amber-600" />}
          linkTo="/dashboard/salary"
        />
      </section>

      {/* Quick access cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Salary Calculator */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="rounded-lg bg-purple-100 p-3">
                <FileSpreadsheet className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Salary Calculator
                </h2>
                <p className="text-sm text-gray-600">
                  Process employee attendance and calculate salaries
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/salary"
              className="text-purple-600 hover:text-purple-800"
            >
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-full">
              Attendance Import
            </span>
            <span className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-full">
              Buffer Rules
            </span>
            <span className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-full">
              Salary Export
            </span>
          </div>
        </div>

        {/* Career Applications */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="rounded-lg bg-purple-100 p-3">
                <Briefcase className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Career Applications
                </h2>
                <p className="text-sm text-gray-600">
                  Review and manage job applications
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/careers"
              className="text-purple-600 hover:text-purple-800"
            >
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-full">
              {careerApplications.filter((app) => app.status === "New").length}{" "}
              New Applications
            </span>
            <span className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-full">
              {
                careerApplications.filter((app) => app.status === "In Review")
                  .length
              }{" "}
              Pending Reviews
            </span>
          </div>
        </div>
      </section>

      {/* Recent activities */}
      <section className="bg-white rounded-lg shadow-md p-6 border">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Recent Activities
        </h2>
        <div className="space-y-4">
          {careerApplications.slice(0, 4).map((application) => (
            <Activity
              key={application._id}
              icon={<Briefcase className="w-5 h-5 text-purple-600" />}
              title={`New job application received`}
              description={`${application.name} - ${application.role}`}
              time={formatTimeAgo(new Date(application.createdAt))}
            />
          ))}
          <Activity
            icon={<FileSpreadsheet className="w-5 h-5 text-purple-600" />}
            title="Salary calculation completed"
            description="Monthly salaries for 42 employees processed"
            time="2 hours ago"
          />
        </div>
      </section>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  period: string;
  icon: React.ReactNode;
  linkTo: string;
}

function StatCard({
  title,
  value,
  change,
  period,
  icon,
  linkTo,
}: StatCardProps) {
  const isPositive = change.startsWith("+");

  return (
    <Link href={linkTo}>
      <div className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow cursor-pointer border">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 my-1">{value}</p>
            <div className="flex items-center text-sm">
              <span className={isPositive ? "text-green-600" : "text-red-600"}>
                {change}
              </span>
              <span className="text-gray-500 ml-1">{period}</span>
            </div>
          </div>
          <div className="rounded-full bg-gray-50 p-3">{icon}</div>
        </div>
      </div>
    </Link>
  );
}

interface ActivityProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  time: string;
}

function Activity({ icon, title, description, time }: ActivityProps) {
  return (
    <div className="flex items-start pb-4 border-b border-gray-100 last:border-none last:pb-0">
      <div className="rounded-full bg-gray-50 p-2 mr-3">{icon}</div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <div className="text-xs text-gray-500">{time}</div>
    </div>
  );
}

// Utility function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  return date.toLocaleDateString();
}
