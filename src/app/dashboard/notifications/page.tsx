// app/dashboard/careers/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Briefcase,
  Search,
  Filter,
  ChevronDown,
  Eye,
  Mail,
  Phone,
  Calendar,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  IndianRupee,
} from "lucide-react";
import { CareerApplication } from "@/app/api/careers/route";
import { CareerStatus, STATUS_OPTIONS } from "@/app/types/career";

export default function CareersPage() {
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [positionFilter, setPositionFilter] = useState<string>("All");
  const [selectedApplication, setSelectedApplication] =
    useState<CareerApplication | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const applicationsPerPage = 10;

  useEffect(() => {
    const fetchApplications = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/careers");

        if (!response.ok) {
          throw new Error("Failed to fetch career applications");
        }

        const data = await response.json();
        setApplications(data);
      } catch (err) {
        console.error("Error fetching career applications:", err);
        setError("Unable to load job applications. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, []);

  // Filtering and Pagination Logic
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.role.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || app.status === statusFilter;
      const matchesPosition =
        positionFilter === "All" || app.role === positionFilter;

      return matchesSearch && matchesStatus && matchesPosition;
    });
  }, [applications, searchQuery, statusFilter, positionFilter]);

  // Paginated Applications
  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * applicationsPerPage;
    return filteredApplications.slice(
      startIndex,
      startIndex + applicationsPerPage
    );
  }, [filteredApplications, currentPage]);

  // Pagination Calculations
  const totalPages = Math.ceil(
    filteredApplications.length / applicationsPerPage
  );

  // Get unique positions for filter dropdown
  const positions = ["All", ...new Set(applications.map((app) => app.role))];

  // Download resume with improved error handling
  const downloadResume = async (resumeUrl: string) => {
    try {
      const response = await fetch(resumeUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume_${
        selectedApplication?.name || "application"
      }${getFileExtension(blob.type)}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // Show success notification
      showNotification("Resume downloaded successfully", "success");
    } catch (err) {
      console.error("Error downloading resume:", err);
      showNotification("Failed to download resume. Please try again.", "error");
    }
  };

  // Helper function to get file extension
  const getFileExtension = (mimeType: string) => {
    const extensions: { [key: string]: string } = {
      "application/pdf": ".pdf",
      "application/msword": ".doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        ".docx",
      "text/plain": ".txt",
    };
    return extensions[mimeType] || ".file";
  };

  // Notification function
  const showNotification = (
    message: string,
    type: "success" | "error" = "error"
  ) => {
    const notificationContainer = document.createElement("div");
    notificationContainer.className = `
      fixed top-4 right-4 z-50 
      ${
        type === "error"
          ? "bg-red-100 border-red-400 text-red-700"
          : "bg-green-100 border-green-400 text-green-700"
      }
      border px-4 py-3 rounded 
      shadow-lg transition-all duration-300 ease-in-out
      flex items-center
    `;

    notificationContainer.innerHTML = `
      <div class="flex items-center">
        ${
          type === "error"
            ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
             </svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
             </svg>`
        }
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notificationContainer);

    // Remove the notification after 5 seconds
    setTimeout(() => {
      notificationContainer.classList.add("opacity-0", "translate-x-full");
      setTimeout(() => {
        document.body.removeChild(notificationContainer);
      }, 300);
    }, 5000);
  };

  // Pagination Handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // View application details
  const viewApplicationDetails = (application: CareerApplication) => {
    setSelectedApplication(application);
    setShowDetailModal(true);
  };

  // Update application status
  const updateApplicationStatus = async (
    id: string,
    newStatus: CareerApplication["status"]
  ) => {
    try {
      const response = await fetch(`/api/careers`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update application status");
      }

      // Update local state
      setApplications((prevApps) =>
        prevApps.map((app) =>
          app._id === id ? { ...app, status: newStatus } : app
        )
      );

      // Update selected application if it's the same one
      if (selectedApplication?._id === id) {
        setSelectedApplication((prev) =>
          prev ? { ...prev, status: newStatus } : null
        );
      }

      // Show success notification
      showNotification(`Application status updated to ${newStatus}`, "success");
    } catch (err) {
      console.error("Error updating application status:", err);
      showNotification("Failed to update application status", "error");
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Error Notification */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center mb-4">
          <AlertTriangle className="w-5 h-5 mr-3 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center mb-2">
            <Briefcase className="mr-3 text-purple-600" />
            Career Applications
          </h1>
          <p className="text-gray-600">
            Manage and track job applications from candidates
          </p>
        </div>
      </div>

      {/* Filters and search */}
      <div className="bg-white rounded-lg shadow-md p-5 mb-6 border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 justify-center flex">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none  text-gray-700">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search applications by name, email, or position..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 text-gray-700 focus:ring-purple-500 focus:border-purple-500 transition duration-300"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on new search
              }}
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            {/* Status Filter */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="block text-gray-700 w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-300"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1); // Reset to first page on filter change
                }}
              >
                <option value="All">All Statuses</option>
                <option value="New">New</option>
                <option value="In Review">In Review</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* Position Filter */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position
              </label>
              <select
                className="block text-gray-700 w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-300"
                value={positionFilter}
                onChange={(e) => {
                  setPositionFilter(e.target.value);
                  setCurrentPage(1); // Reset to first page on filter change
                }}
              >
                {positions.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Applications list */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6 border">
        <div className="overflow-x-auto ">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead>
              <tr>
                {["Name", "Position", "Applied Date", "Status", "Actions"].map(
                  (header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedApplications.map((application) => (
                <tr
                  key={application._id}
                  className="hover:bg-gray-50 transition duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
                        {application.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {application.name}
                        </div>
                        <div className="text-sm text-gray-700">
                          {application.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {application.role}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {formatDate(application.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${
                        application.status === "New"
                          ? "bg-purple-100 text-purple-800"
                          : application.status === "In Review"
                          ? "bg-yellow-100 text-yellow-800"
                          : application.status === "Shortlisted"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {application.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium ">
                    <button
                      onClick={() => viewApplicationDetails(application)}
                      className="text-purple-600 hover:text-purple-800 flex items-center transition duration-300 transform cursor-pointer"
                    >
                      <Eye className="h-5 w-5 mr-2" /> View
                    </button>
                  </td>
                </tr>
              ))}

              {paginatedApplications.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-gray-700"
                  >
                    No applications found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center bg-white rounded-lg shadow-md p-4">
        <div className="text-sm text-gray-700">
          Showing{" "}
          <span className="font-medium">
            {(currentPage - 1) * applicationsPerPage + 1}
          </span>{" "}
          to{" "}
          <span className="font-medium">
            {Math.min(
              currentPage * applicationsPerPage,
              filteredApplications.length
            )}
          </span>{" "}
          of <span className="font-medium">{filteredApplications.length}</span>{" "}
          results
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 
            hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed 
            flex items-center transition duration-300"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 
            hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed 
            flex items-center transition duration-300"
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Application detail modal */}
      {showDetailModal && selectedApplication && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          onClick={(e) => {
            // Close modal if click is on the outer div
            if (e.target === e.currentTarget) {
              setShowDetailModal(false);
            }
          }}
        >
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Application Details
                  </h3>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 border-t pt-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl font-bold">
                        {selectedApplication.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-medium text-gray-900">
                          {selectedApplication.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {selectedApplication.role}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 md:mt-0">
                      <span
                        className={`px-2  py-1 inline-flex text-sm leading-5 font-semibold rounded-full  
                        ${
                          selectedApplication.status === "New"
                            ? "bg-purple-100 text-purple-800"
                            : selectedApplication.status === "In Review"
                            ? "bg-yellow-100 text-yellow-800"
                            : selectedApplication.status === "Shortlisted"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedApplication.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700">
                        Contact Information
                      </h5>
                      <div className="mt-2 space-y-2 text-gray-700">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <a
                            href={`mailto:${selectedApplication.email}`}
                            className="hover:underline"
                          >
                            {selectedApplication.email}
                          </a>
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <a
                            href={`tel:${selectedApplication.mobile}`}
                            className="hover:underline"
                          >
                            {selectedApplication.mobile}
                          </a>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span>
                            {formatDate(selectedApplication.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700">
                        Professional Details
                      </h5>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center">
                          <Briefcase className="h-4 w-4  text-gray-400 mr-2" />
                          <span className="text-gray-700">
                            Current Company:{" "}
                            {selectedApplication.currentCompany || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <IndianRupee className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-700">
                            Current CTC:{" "}
                            {selectedApplication.currentCtc || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <IndianRupee className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-700">
                            Expected CTC:{" "}
                            {selectedApplication.expectedCtc || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-700">
                            Earliest Start Date:{" "}
                            {selectedApplication.earliestStartDate || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h5 className="text-sm font-medium text-gray-700">
                      Documents
                    </h5>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center">
                        <Download className="h-4 w-4 text-gray-400 mr-2" />
                        <button
                          onClick={() =>
                            downloadResume(selectedApplication.resume)
                          }
                          className="text-purple-600 hover:underline"
                        >
                          Download Resume
                        </button>
                      </div>
                    </div>
                  </div>

                  {selectedApplication.notes && (
                    <div className="mt-6">
                      <h5 className="text-sm font-medium text-gray-700">
                        Additional Notes
                      </h5>
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-md">
                        {selectedApplication.notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse items-center">
                <div className="flex items-center space-x-4">
                  {/* Status Selection Dropdown */}
                  <div className="relative flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">
                      Status:
                    </label>
                    <div className="relative">
                      <select
                        value={selectedApplication.status}
                        onChange={(e) => {
                          setSelectedApplication((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  status: e.target.value as CareerStatus,
                                }
                              : null
                          );
                        }}
                        className="block w-full pl-3 pr-10 py-2 border text-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm appearance-none"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>

                    {/* Save Status Button */}
                    <button
                      onClick={() =>
                        updateApplicationStatus(
                          selectedApplication._id,
                          selectedApplication.status
                        )
                      }
                      className="inline-flex items-center justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:text-sm transition duration-300 ease-in-out"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Status
                    </button>
                  </div>

                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface CareerApplicationFilterProps {
  filteredApplications: CareerApplication[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  positionFilter: string;
  setPositionFilter: (position: string) => void;
}

// Utility function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
