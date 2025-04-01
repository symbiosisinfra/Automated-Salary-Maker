// app/dashboard/settings/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Settings,
  Search,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Building,
  Briefcase,
  Loader2,
  Eye,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Department, Designation } from "@/app/types/models";
import toast from "react-hot-toast";

// Tab options
type SettingsTab = "departments" | "designations";

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin =
    session?.user?.role === "admin" || session?.user?.role === "superadmin";

  // State for tabs
  const [activeTab, setActiveTab] = useState<SettingsTab>("departments");

  // State for departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [isEditingDepartment, setIsEditingDepartment] = useState(false);
  const [departmentFormData, setDepartmentFormData] = useState<
    Partial<Department>
  >({});

  // State for designations
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [designationSearchQuery, setDesignationSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("All");
  const [selectedDesignation, setSelectedDesignation] =
    useState<Designation | null>(null);
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [isEditingDesignation, setIsEditingDesignation] = useState(false);
  const [designationFormData, setDesignationFormData] = useState<
    Partial<Designation>
  >({});

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Pagination for departments
  const [departmentCurrentPage, setDepartmentCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Pagination for designations
  const [designationCurrentPage, setDesignationCurrentPage] = useState(1);

  // Fetch departments and designations
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch departments
        const departmentsResponse = await fetch("/api/departments");
        if (!departmentsResponse.ok) {
          throw new Error("Failed to fetch departments");
        }
        const departmentsData = await departmentsResponse.json();
        setDepartments(departmentsData);

        // Fetch designations
        const designationsResponse = await fetch("/api/designations");
        if (!designationsResponse.ok) {
          throw new Error("Failed to fetch designations");
        }
        const designationsData = await designationsResponse.json();
        setDesignations(designationsData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Unable to load settings data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtered departments
  const filteredDepartments = useMemo(() => {
    return departments.filter(
      (department) =>
        department.name
          .toLowerCase()
          .includes(departmentSearchQuery.toLowerCase()) ||
        (department.description &&
          department.description
            .toLowerCase()
            .includes(departmentSearchQuery.toLowerCase()))
    );
  }, [departments, departmentSearchQuery]);

  // Paginated departments
  const paginatedDepartments = useMemo(() => {
    const startIndex = (departmentCurrentPage - 1) * itemsPerPage;
    return filteredDepartments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDepartments, departmentCurrentPage]);

  // Department pagination calculations
  const departmentTotalPages = Math.ceil(
    filteredDepartments.length / itemsPerPage
  );

  // Filtered designations
  const filteredDesignations = useMemo(() => {
    return designations.filter((designation) => {
      const matchesSearch =
        designation.name
          .toLowerCase()
          .includes(designationSearchQuery.toLowerCase()) ||
        (designation.description &&
          designation.description
            .toLowerCase()
            .includes(designationSearchQuery.toLowerCase()));

      const matchesDepartment =
        departmentFilter === "All" ||
        designation.department === departmentFilter;

      return matchesSearch && matchesDepartment;
    });
  }, [designations, designationSearchQuery, departmentFilter]);

  // Paginated designations
  const paginatedDesignations = useMemo(() => {
    const startIndex = (designationCurrentPage - 1) * itemsPerPage;
    return filteredDesignations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDesignations, designationCurrentPage]);

  // Designation pagination calculations
  const designationTotalPages = Math.ceil(
    filteredDesignations.length / itemsPerPage
  );

  // Load designations for a specific department
  const loadDesignationsForDepartment = async (departmentName: string) => {
    try {
      const response = await fetch(
        `/api/designations?department=${departmentName}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch designations for department");
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Error fetching designations for department:", err);
      return [];
    }
  };

  // Handle department form input changes
  const handleDepartmentInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setDepartmentFormData({
      ...departmentFormData,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  // Handle department active toggle
  const handleDepartmentActiveToggle = () => {
    setDepartmentFormData({
      ...departmentFormData,
      active: !departmentFormData.active,
    });
  };

  // Handle designation form input changes
  const handleDesignationInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setDesignationFormData({
      ...designationFormData,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  // Handle designation active toggle
  const handleDesignationActiveToggle = () => {
    setDesignationFormData({
      ...designationFormData,
      active: !designationFormData.active,
    });
  };

  // Reset department form
  const resetDepartmentForm = () => {
    setDepartmentFormData({});
    setIsEditingDepartment(false);
  };

  // Reset designation form
  const resetDesignationForm = () => {
    setDesignationFormData({});
    setIsEditingDesignation(false);
  };

  // Handle add department
  const handleAddDepartment = () => {
    resetDepartmentForm();
    setDepartmentFormData({ active: true });
    setShowDepartmentModal(true);
  };

  // Handle edit department
  const handleEditDepartment = (department: Department) => {
    setDepartmentFormData({ ...department });
    setIsEditingDepartment(true);
    setShowDepartmentModal(true);
  };

  // Handle add designation
  const handleAddDesignation = () => {
    resetDesignationForm();
    setDesignationFormData({ active: true });
    setShowDesignationModal(true);
  };

  // Handle edit designation
  const handleEditDesignation = (designation: Designation) => {
    setDesignationFormData({ ...designation });
    setIsEditingDesignation(true);
    setShowDesignationModal(true);
  };

  // Save department
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (!departmentFormData.name) {
        toast.error("Department name is required");
        setIsSaving(false);
        return;
      }

      if (isEditingDepartment && departmentFormData._id) {
        // Update existing department
        const response = await fetch(`/api/departments`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: departmentFormData._id,
            ...departmentFormData,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update department");
        }

        // Refresh departments list
        const departmentsResponse = await fetch("/api/departments");
        const departmentsData = await departmentsResponse.json();
        setDepartments(departmentsData);

        toast.success("Department updated successfully");
      } else {
        // Create new department
        const response = await fetch("/api/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(departmentFormData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create department");
        }

        // Refresh departments list
        const departmentsResponse = await fetch("/api/departments");
        const departmentsData = await departmentsResponse.json();
        setDepartments(departmentsData);

        toast.success("Department added successfully");
      }

      // Close the modal and reset form
      setShowDepartmentModal(false);
      resetDepartmentForm();
    } catch (err) {
      console.error("Error saving department:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save department"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Save designation
  const handleSaveDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (!designationFormData.name) {
        toast.error("Designation name is required");
        setIsSaving(false);
        return;
      }

      if (!designationFormData.department) {
        toast.error("Department is required");
        setIsSaving(false);
        return;
      }

      if (isEditingDesignation && designationFormData._id) {
        // Update existing designation
        const response = await fetch(`/api/designations`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: designationFormData._id,
            ...designationFormData,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update designation");
        }

        // Refresh designations list
        const designationsResponse = await fetch("/api/designations");
        const designationsData = await designationsResponse.json();
        setDesignations(designationsData);

        toast.success("Designation updated successfully");
      } else {
        // Create new designation
        const response = await fetch("/api/designations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(designationFormData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create designation");
        }

        // Refresh designations list
        const designationsResponse = await fetch("/api/designations");
        const designationsData = await designationsResponse.json();
        setDesignations(designationsData);

        toast.success("Designation added successfully");
      }

      // Close the modal and reset form
      setShowDesignationModal(false);
      resetDesignationForm();
    } catch (err) {
      console.error("Error saving designation:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save designation"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Delete department
  const handleDeleteDepartment = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this department?\nNote: You cannot delete a department that is being used by designations or employees."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/departments?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete department");
      }

      // Refresh departments list
      const departmentsResponse = await fetch("/api/departments");
      const departmentsData = await departmentsResponse.json();
      setDepartments(departmentsData);

      toast.success("Department deleted successfully");
    } catch (err) {
      console.error("Error deleting department:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to delete department"
      );
    }
  };

  // Delete designation
  const handleDeleteDesignation = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this designation?\nNote: You cannot delete a designation that is being used by employees."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/designations?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete designation");
      }

      // Refresh designations list
      const designationsResponse = await fetch("/api/designations");
      const designationsData = await designationsResponse.json();
      setDesignations(designationsData);

      toast.success("Designation deleted successfully");
    } catch (err) {
      console.error("Error deleting designation:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to delete designation"
      );
    }
  };

  // Department pagination handlers
  const handlePrevDepartmentPage = () => {
    if (departmentCurrentPage > 1) {
      setDepartmentCurrentPage(departmentCurrentPage - 1);
    }
  };

  const handleNextDepartmentPage = () => {
    if (departmentCurrentPage < departmentTotalPages) {
      setDepartmentCurrentPage(departmentCurrentPage + 1);
    }
  };

  // Designation pagination handlers
  const handlePrevDesignationPage = () => {
    if (designationCurrentPage > 1) {
      setDesignationCurrentPage(designationCurrentPage - 1);
    }
  };

  const handleNextDesignationPage = () => {
    if (designationCurrentPage < designationTotalPages) {
      setDesignationCurrentPage(designationCurrentPage + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings data...</p>
        </div>
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
            <Settings className="mr-3 text-purple-600" />
            Settings
          </h1>
          <p className="text-gray-600">
            Manage organization settings and configurations
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border">
        <div className="border-b">
          <div className="flex">
            <button
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === "departments"
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("departments")}
            >
              <Building className="inline-block w-4 h-4 mr-2" />
              Departments
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === "designations"
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("designations")}
            >
              <Briefcase className="inline-block w-4 h-4 mr-2" />
              Designations
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Departments Tab */}
          {activeTab === "departments" && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="relative w-full md:w-auto md:flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search departments..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 text-gray-700 focus:ring-purple-500 focus:border-purple-500 transition duration-300"
                    value={departmentSearchQuery}
                    onChange={(e) => {
                      setDepartmentSearchQuery(e.target.value);
                      setDepartmentCurrentPage(1);
                    }}
                  />
                </div>

                {isAdmin && (
                  <button
                    onClick={handleAddDepartment}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition flex items-center whitespace-nowrap"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Department
                  </button>
                )}
              </div>

              {/* Departments Table */}
              <div className="bg-white rounded-lg overflow-hidden border mb-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-left">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Department Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        {isAdmin && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedDepartments.map((department) => (
                        <tr
                          key={department._id}
                          className="hover:bg-gray-50 transition duration-150"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {department.name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700">
                              {department.description || "No description"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${
                                department.active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {department.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() =>
                                    handleEditDepartment(department)
                                  }
                                  className="text-blue-600 hover:text-blue-800 flex items-center transition"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteDepartment(department._id)
                                  }
                                  className="text-red-600 hover:text-red-800 flex items-center transition"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}

                      {paginatedDepartments.length === 0 && (
                        <tr>
                          <td
                            colSpan={isAdmin ? 4 : 3}
                            className="px-6 py-4 text-center text-gray-700"
                          >
                            No departments found matching your criteria
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Departments Pagination */}
              {filteredDepartments.length > 0 && (
                <div className="flex justify-between items-center bg-white rounded-lg shadow-md p-4">
                  <div className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-medium">
                      {(departmentCurrentPage - 1) * itemsPerPage + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(
                        departmentCurrentPage * itemsPerPage,
                        filteredDepartments.length
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {filteredDepartments.length}
                    </span>{" "}
                    results
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handlePrevDepartmentPage}
                      disabled={departmentCurrentPage === 1}
                      className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 
                      hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed 
                      flex items-center transition duration-300"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </button>
                    <button
                      onClick={handleNextDepartmentPage}
                      disabled={departmentCurrentPage === departmentTotalPages}
                      className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 
                      hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed 
                      flex items-center transition duration-300"
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Designations Tab */}
          {activeTab === "designations" && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="relative w-full md:w-auto md:flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search designations..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 text-gray-700 focus:ring-purple-500 focus:border-purple-500 transition duration-300"
                    value={designationSearchQuery}
                    onChange={(e) => {
                      setDesignationSearchQuery(e.target.value);
                      setDesignationCurrentPage(1);
                    }}
                  />
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                  <div className="relative">
                    <select
                      className="block text-gray-700 w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-300"
                      value={departmentFilter}
                      onChange={(e) => {
                        setDepartmentFilter(e.target.value);
                        setDesignationCurrentPage(1);
                      }}
                    >
                      <option value="All">All Departments</option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={handleAddDesignation}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition flex items-center whitespace-nowrap"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Designation
                    </button>
                  )}
                </div>
              </div>

              {/* Designations Table */}
              <div className="bg-white rounded-lg overflow-hidden border mb-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-left">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Designation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        {isAdmin && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedDesignations.map((designation) => (
                        <tr
                          key={designation._id}
                          className="hover:bg-gray-50 transition duration-150"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {designation.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">
                              {designation.department}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700">
                              {designation.description || "No description"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${
                                designation.active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {designation.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() =>
                                    handleEditDesignation(designation)
                                  }
                                  className="text-blue-600 hover:text-blue-800 flex items-center transition"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteDesignation(designation._id)
                                  }
                                  className="text-red-600 hover:text-red-800 flex items-center transition"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}

                      {paginatedDesignations.length === 0 && (
                        <tr>
                          <td
                            colSpan={isAdmin ? 5 : 4}
                            className="px-6 py-4 text-center text-gray-700"
                          >
                            No designations found matching your criteria
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Designations Pagination */}
              {filteredDesignations.length > 0 && (
                <div className="flex justify-between items-center bg-white rounded-lg shadow-md p-4">
                  <div className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-medium">
                      {(designationCurrentPage - 1) * itemsPerPage + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(
                        designationCurrentPage * itemsPerPage,
                        filteredDesignations.length
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {filteredDesignations.length}
                    </span>{" "}
                    results
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handlePrevDesignationPage}
                      disabled={designationCurrentPage === 1}
                      className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 
                    hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed 
                    flex items-center transition duration-300"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </button>
                    <button
                      onClick={handleNextDesignationPage}
                      disabled={
                        designationCurrentPage === designationTotalPages
                      }
                      className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 
                    hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed 
                    flex items-center transition duration-300"
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Department Modal */}
      {showDepartmentModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDepartmentModal(false);
              resetDepartmentForm();
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
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {isEditingDepartment ? "Edit Department" : "Add Department"}
                  </h3>
                  <button
                    onClick={() => {
                      setShowDepartmentModal(false);
                      resetDepartmentForm();
                    }}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveDepartment}>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Department Name*
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={departmentFormData.name || ""}
                        onChange={handleDepartmentInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md text-gray-700 shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={departmentFormData.description || ""}
                        onChange={handleDepartmentInputChange}
                        rows={3}
                        className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    </div>

                    <div className="flex items-center">
                      <label className="block text-sm font-medium text-gray-700 mr-4">
                        Status
                      </label>
                      <button
                        type="button"
                        onClick={handleDepartmentActiveToggle}
                        className="flex items-center focus:outline-none"
                      >
                        {departmentFormData.active ? (
                          <>
                            <ToggleRight className="h-6 w-6 text-green-600 mr-2" />
                            <span className="text-sm text-green-600">
                              Active
                            </span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-6 w-6 text-red-600 mr-2" />
                            <span className="text-sm text-red-600">
                              Inactive
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDepartmentModal(false);
                        resetDepartmentForm();
                      }}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-400 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {isEditingDepartment ? "Update" : "Save"}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Designation Modal */}
      {showDesignationModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDesignationModal(false);
              resetDesignationForm();
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
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {isEditingDesignation
                      ? "Edit Designation"
                      : "Add Designation"}
                  </h3>
                  <button
                    onClick={() => {
                      setShowDesignationModal(false);
                      resetDesignationForm();
                    }}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveDesignation}>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Designation Name*
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={designationFormData.name || ""}
                        onChange={handleDesignationInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-700"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="department"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Department*
                      </label>
                      <select
                        id="department"
                        name="department"
                        value={designationFormData.department || ""}
                        onChange={handleDesignationInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-700"
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept._id} value={dept.name}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={designationFormData.description || ""}
                        onChange={handleDesignationInputChange}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-700"
                      />
                    </div>

                    <div className="flex items-center">
                      <label className="block text-sm font-medium text-gray-700 mr-4">
                        Status
                      </label>
                      <button
                        type="button"
                        onClick={handleDesignationActiveToggle}
                        className="flex items-center focus:outline-none"
                      >
                        {designationFormData.active ? (
                          <>
                            <ToggleRight className="h-6 w-6 text-green-600 mr-2" />
                            <span className="text-sm text-green-600">
                              Active
                            </span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-6 w-6 text-red-600 mr-2" />
                            <span className="text-sm text-red-600">
                              Inactive
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDesignationModal(false);
                        resetDesignationForm();
                      }}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-400 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {isEditingDesignation ? "Update" : "Save"}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
