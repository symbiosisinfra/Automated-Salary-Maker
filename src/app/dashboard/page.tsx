// app/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
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
  Building,
  Award,
  Layers,
  UserPlus,
  Activity,
  PieChart,
  CheckCircle,
  AlertCircle,
  Bell,
  RefreshCw,
  ChevronDown,
  Inbox,
} from "lucide-react";
import Link from "next/link";
import { CareerApplication } from "@/app/api/careers/route";
import { Department, Designation, Employee } from "@/app/types/models";

// Define the metrics interface
interface DashboardMetrics {
  // Employee stats
  activeEmployees: number;
  totalEmployees: number;

  // Department stats
  activeDepartments: number;
  totalDepartments: number;

  // Designation stats
  activeDesignations: number;
  totalDesignations: number;

  // Application stats
  newApplications: number;
  hiredApplications: number;
  shortlistedApplications: number;
  totalApplications: number;

  // Salary metrics
  totalSalary: number;
  avgSalary: number;

  // Department distribution
  departmentDistribution: Record<string, number>;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data states
  const [careerApplications, setCareerApplications] = useState<
    CareerApplication[]
  >([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Toggle states
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showAllApplications, setShowAllApplications] = useState(false);

  // Initialize metrics with default values
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    // Employee stats
    activeEmployees: 0,
    totalEmployees: 0,

    // Department stats
    activeDepartments: 0,
    totalDepartments: 0,

    // Designation stats
    activeDesignations: 0,
    totalDesignations: 0,

    // Application stats
    newApplications: 0,
    hiredApplications: 0,
    shortlistedApplications: 0,
    totalApplications: 0,

    // Salary metrics
    totalSalary: 0,
    avgSalary: 0,

    // Department distribution (empty object initially)
    departmentDistribution: {},
  });

  // Fetch dashboard data with retry logic
  const fetchDashboardData = async (showRefreshIndicator = true) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Implement retry logic for critical API calls
      const fetchWithRetry = async (
        url: string,
        retries = 3,
        timeout = 10000
      ) => {
        for (let i = 0; i < retries; i++) {
          try {
            // Create an abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
              signal: controller.signal,
              headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                Pragma: "no-cache",
                Expires: "0",
              },
            });

            // Clear the timeout
            clearTimeout(timeoutId);

            if (!response.ok) {
              throw new Error(`Failed to fetch: ${url} (${response.status})`);
            }

            return await response.json();
          } catch (err) {
            console.warn(`Fetch attempt ${i + 1} failed for ${url}:`, err);

            if (err instanceof DOMException && err.name === "AbortError") {
              console.warn(`Request timed out after ${timeout}ms`);
            }

            if (i === retries - 1) throw err;

            // Wait before retrying (exponential backoff)
            const delay = 1000 * Math.pow(2, i);
            console.log(`Retrying in ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
          }
        }
        return []; // Fallback empty array if all attempts fail but don't throw
      };

      // Fetch all required data with retry
      const [careerData, employeeData, departmentData, designationData] =
        await Promise.all([
          fetchWithRetry("/api/careers"),
          fetchWithRetry("/api/employees"),
          fetchWithRetry("/api/departments"),
          fetchWithRetry("/api/designations"),
        ]);

      // Update state with fetched data
      setCareerApplications(careerData || []);
      setEmployees(employeeData || []);
      setDepartments(departmentData || []);
      setDesignations(designationData || []);
      setLastUpdated(new Date());

      // Calculate metrics directly
      calculateMetrics(
        employeeData,
        departmentData,
        designationData,
        careerData
      );
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load dashboard data"
      );
      // Don't reset the existing data on error
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchDashboardData(false);

    // Set up periodic refresh
    const refreshInterval = setInterval(() => {
      fetchDashboardData(true);
    }, 300000); // Refresh every 5 minutes

    // Clean up interval on unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // Function to calculate metrics from data
  const calculateMetrics = (
    employees: Employee[],
    departments: Department[],
    designations: Designation[],
    careerApplications: CareerApplication[]
  ) => {
    // Employee stats
    const activeEmployees = employees.filter(
      (emp) => emp.status === "Active"
    ).length;

    // Department stats
    const activeDepartments = departments.filter((dept) => dept.active).length;

    // Designation stats
    const activeDesignations = designations.filter(
      (desg) => desg.active
    ).length;

    // Application stats
    const newApplications = careerApplications.filter(
      (app) => app.status === "New"
    ).length;
    const hiredApplications = careerApplications.filter(
      (app) => app.status === "Hired"
    ).length;
    const shortlistedApplications = careerApplications.filter(
      (app) => app.status === "Shortlisted"
    ).length;

    // Salary metrics (if available)
    const totalSalary = employees.reduce(
      (sum, emp) => sum + (emp.salary || 0),
      0
    );
    const avgSalary = employees.length
      ? Math.round(totalSalary / employees.length)
      : 0;

    // Department distribution
    const departmentDistribution = employees.reduce((acc, emp) => {
      acc[emp.department] = (acc[emp.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Update metrics state
    setMetrics({
      activeEmployees,
      totalEmployees: employees.length,
      activeDepartments,
      totalDepartments: departments.length,
      activeDesignations,
      totalDesignations: designations.length,
      newApplications,
      hiredApplications,
      shortlistedApplications,
      totalApplications: careerApplications.length,
      totalSalary,
      avgSalary,
      departmentDistribution,
    });
  };

  // Recent activities (combine all events)
  const recentActivities = useMemo(() => {
    const activities = [
      // Recent job applications
      ...careerApplications.map((app) => ({
        type: "application",
        title: `New job application received`,
        description: `${app.name} - ${app.role}`,
        time: new Date(app.createdAt),
        icon: <Briefcase className="w-5 h-5 text-purple-600" />,
      })),
    ];

    // Sort by time (most recent first)
    return activities.sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [careerApplications]);

  // Recent job applications (last 5)
  const recentApplications = useMemo(() => {
    return careerApplications
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, showAllApplications ? careerApplications.length : 5);
  }, [careerApplications, showAllApplications]);

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Handle manual refresh
  const handleManualRefresh = () => {
    fetchDashboardData(true);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Error alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center mb-4">
          <AlertCircle className="w-5 h-5 mr-3 text-red-600" />
          <span>{error}</span>
          <button
            onClick={handleManualRefresh}
            className="ml-auto bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm flex items-center"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </button>
        </div>
      )}

      {/* Header with page title and last refresh time */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center mb-1">
            <Activity className="mr-3 text-purple-600" />
            Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, {session?.user?.name || "User"}! Here's your overview
            of Symbiosis Infra Private Limited.
          </p>
        </div>
        <div className="mt-2 md:mt-0 flex items-center">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="text-gray-500 hover:text-purple-600 mr-3 p-1 rounded-full hover:bg-purple-50 transition-colors disabled:opacity-50"
            title="Refresh dashboard"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
          <div className="text-xs text-gray-500 flex items-center">
            Last updated: {formatTimeAgo(lastUpdated)}
          </div>
        </div>
      </div>

      {/* Main stats - 4 key metrics */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Employees"
          value={metrics.activeEmployees.toString()}
          total={metrics.totalEmployees}
          icon={<Users className="w-7 h-7 text-purple-600" />}
          linkTo="/dashboard/employees"
          color="purple"
          className="h-full"
        />
        <StatCard
          title="Active Departments"
          value={metrics.activeDepartments.toString()}
          total={metrics.totalDepartments}
          icon={<Building className="w-7 h-7 text-blue-600" />}
          linkTo="/dashboard/settings"
          color="blue"
          className="h-full"
        />
        <StatCard
          title="Job Applications"
          value={metrics.newApplications.toString()}
          total={metrics.totalApplications}
          label="New"
          icon={<Briefcase className="w-7 h-7 text-amber-600" />}
          linkTo="/dashboard/careers"
          color="amber"
          className="h-full"
        />
        <StatCard
          title="Average Salary"
          value={formatCurrency(metrics.avgSalary)}
          icon={<IndianRupee className="w-7 h-7 text-green-600" />}
          linkTo="/dashboard/employees"
          color="green"
          className="h-full"
        />
      </section>

      {/* Mid-level stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Department breakdown */}
        <section className="bg-white rounded-lg shadow-md border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Building className="w-5 h-5 mr-2 text-blue-600" />
              Department Distribution
            </h2>
            <Link
              href="/dashboard/settings"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              Manage
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="space-y-3">
            {Object.entries(metrics.departmentDistribution).length > 0 ? (
              Object.entries(metrics.departmentDistribution)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([department, count]) => (
                  <div
                    key={department}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-600 mr-2"></div>
                      <span className="text-sm text-gray-700">
                        {department}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">
                        {count}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        employees
                      </span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                No department data available
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Departments</span>
              <span className="font-medium text-gray-900">
                {metrics.totalDepartments}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Active Designations</span>
              <span className="font-medium text-gray-900">
                {metrics.activeDesignations}
              </span>
            </div>
          </div>
        </section>

        {/* Application status */}
        <section className="bg-white rounded-lg shadow-md border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-amber-600" />
              Application Status
            </h2>
            <Link
              href="/dashboard/careers"
              className="text-amber-600 hover:text-amber-800 text-sm font-medium flex items-center"
            >
              View all
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-amber-700">
                {metrics.newApplications}
              </div>
              <div className="text-sm text-amber-600 flex items-center">
                <Inbox className="w-4 h-4 mr-1" />
                New Applications
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-700">
                {metrics.hiredApplications}
              </div>
              <div className="text-sm text-blue-600 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Hired
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-700">
                {metrics.shortlistedApplications}
              </div>
              <div className="text-sm text-green-600 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Shortlisted
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-700">
                {metrics.totalApplications}
              </div>
              <div className="text-sm text-purple-600 flex items-center">
                <Layers className="w-4 h-4 mr-1" />
                Total Applications
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Recent job applications */}
      <section className="bg-white rounded-lg shadow-md border p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <UserPlus className="w-5 h-5 mr-2 text-purple-600" />
            Recent Job Applications
          </h2>
          <button
            onClick={() => setShowAllApplications(!showAllApplications)}
            className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center"
          >
            {showAllApplications ? "Show less" : "Show more"}
            <ChevronDown
              className={`w-4 h-4 ml-1 transition-transform ${
                showAllApplications ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Candidate
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Position
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Applied
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentApplications.length > 0 ? (
                recentApplications.map((application) => (
                  <tr key={application._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold">
                          {application.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {application.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {application.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {application.role}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${
                          application.status === "New"
                            ? "bg-amber-100 text-amber-800"
                            : application.status === "In Review"
                            ? "bg-blue-100 text-blue-800"
                            : application.status === "Shortlisted"
                            ? "bg-green-100 text-green-800"
                            : application.status === "Hired"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {application.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatTimeAgo(new Date(application.createdAt))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/careers?id=${application._id}`}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-3 text-center text-sm text-gray-500"
                  >
                    No recent applications found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between ">
          <span className="text-sm text-gray-600">
            Showing {recentApplications.length} of {metrics.totalApplications}{" "}
            applications
          </span>

          <Link
            href="/dashboard/careers"
            className="text-sm font-medium text-purple-600 hover:text-purple-800 flex items-center"
          >
            Manage all applications
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </section>

      {/* Quick access links */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <QuickAccessCard
          title="Employees"
          description="Manage employee profiles and details"
          icon={<Users className="w-6 h-6 text-purple-600" />}
          linkTo="/dashboard/employees"
          count={metrics.totalEmployees}
        />
        <QuickAccessCard
          title="Departments"
          description="Manage company departments"
          icon={<Building className="w-6 h-6 text-blue-600" />}
          linkTo="/dashboard/settings"
          count={metrics.totalDepartments}
        />
        <QuickAccessCard
          title="Designations"
          description="Job roles and positions"
          icon={<Award className="w-6 h-6 text-amber-600" />}
          linkTo="/dashboard/settings"
          count={metrics.totalDesignations}
        />
        <QuickAccessCard
          title="Careers"
          description="Track job applications"
          icon={<Briefcase className="w-6 h-6 text-green-600" />}
          linkTo="/dashboard/careers"
          count={metrics.totalApplications}
        />
      </section>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  total?: number;
  label?: string;
  icon: React.ReactNode;
  linkTo: string;
  color: "purple" | "blue" | "green" | "amber";
  className?: string;
}

const StatCard = ({
  title,
  value,
  total,
  label,
  icon,
  linkTo,
  color,
  className = "",
}: StatCardProps) => {
  // Safe calculation to handle zero/undefined totals
  const calculatePercentage = () => {
    if (!total || total === 0 || isNaN(parseInt(value))) return 0;
    return Math.round((parseInt(value) / total) * 100);
  };

  // Use hardcoded class names instead of template strings for Tailwind
  const getColorClasses = () => {
    switch (color) {
      case "purple":
        return {
          bg: "bg-purple-100",
          text: "text-purple-600",
          hover: "hover:text-purple-700",
        };
      case "blue":
        return {
          bg: "bg-blue-100",
          text: "text-blue-600",
          hover: "hover:text-blue-700",
        };
      case "green":
        return {
          bg: "bg-green-100",
          text: "text-green-600",
          hover: "hover:text-green-700",
        };
      case "amber":
        return {
          bg: "bg-amber-100",
          text: "text-amber-600",
          hover: "hover:text-amber-700",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-600",
          hover: "hover:text-gray-700",
        };
    }
  };

  const colorClasses = getColorClasses();

  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-5 flex flex-col h-full ${
        className || ""
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
            {label && (
              <span
                className={`ml-2 text-xs font-medium ${colorClasses.text} ${colorClasses.bg} px-2 py-0.5 rounded`}
              >
                {label}
              </span>
            )}
          </div>
          {total !== undefined && (
            <p className="text-sm text-gray-500 mt-1">
              out of {total} ({calculatePercentage()}%)
            </p>
          )}
        </div>
        <div className={`p-2 rounded-md ${colorClasses.bg} flex-shrink-0`}>
          {icon}
        </div>
      </div>
      <div className="mt-auto pt-2">
        <Link
          href={linkTo}
          className={`${colorClasses.text} ${colorClasses.hover} text-sm font-medium flex items-center`}
        >
          View details
          <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
    </div>
  );
};

interface QuickAccessCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  linkTo: string;
  count?: number;
}

function QuickAccessCard({
  title,
  description,
  icon,
  linkTo,
  count,
}: QuickAccessCardProps) {
  return (
    <Link href={linkTo}>
      <div className="bg-white rounded-lg shadow-md p-4 border hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <div className="rounded-lg bg-gray-50 p-3">{icon}</div>
          {count !== undefined && (
            <span className="text-sm font-semibold bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
              {count}
            </span>
          )}
        </div>
        <h3 className="text-md font-semibold text-gray-800 mt-1">{title}</h3>
        <p className="text-xs text-gray-600 mt-1">{description}</p>
      </div>
    </Link>
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
