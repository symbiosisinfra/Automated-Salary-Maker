// app/dashboard/employees/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  IndianRupee,
  User,
  MapPin,
  Briefcase,
  Building,
  Calendar,
  Mail,
  Phone,
  Award,
  Loader2,
  Eye,
  CreditCard,
  Landmark,
} from "lucide-react";
import { Employee, EmployeeStatus, STATUS_OPTIONS } from "@/app/types/models";
import toast from "react-hot-toast";

export default function EmployeesPage() {
  const { data: session } = useSession();
  const isAdmin =
    session?.user?.role === "admin" || session?.user?.role === "superadmin";

  // State for employee data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<{ name: string }[]>([]);
  const [designations, setDesignations] = useState<
    { name: string; department: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [departmentFilter, setDepartmentFilter] = useState<string>("All");

  // State for employee detail view
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);

  // State for editing or adding new employee
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [departmentDesignations, setDepartmentDesignations] = useState<{
    [key: string]: string[];
  }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const employeesPerPage = 10;

  // Fetch employees, departments, and designations
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch employees
        const empResponse = await fetch("/api/employees");
        if (!empResponse.ok) {
          throw new Error("Failed to fetch employees");
        }
        const empData = await empResponse.json();
        setEmployees(empData);

        // Fetch departments
        const deptResponse = await fetch("/api/departments");
        if (!deptResponse.ok) {
          throw new Error("Failed to fetch departments");
        }
        const deptData = await deptResponse.json();
        setDepartments(deptData);

        // Fetch designations
        const desigResponse = await fetch("/api/designations");
        if (!desigResponse.ok) {
          throw new Error("Failed to fetch designations");
        }
        const desigData = await desigResponse.json();
        setDesignations(desigData);

        // Group designations by department
        const groupedDesignations: { [key: string]: string[] } = {};
        desigData.forEach((designation: any) => {
          if (!groupedDesignations[designation.department]) {
            groupedDesignations[designation.department] = [];
          }
          groupedDesignations[designation.department].push(designation.name);
        });
        setDepartmentDesignations(groupedDesignations);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Unable to load data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Filtering and Pagination Logic
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.designation
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        employee.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.empId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || employee.status === statusFilter;
      const matchesDepartment =
        departmentFilter === "All" || employee.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [employees, searchQuery, statusFilter, departmentFilter]);

  // Paginated Employees
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * employeesPerPage;
    return filteredEmployees.slice(startIndex, startIndex + employeesPerPage);
  }, [filteredEmployees, currentPage]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    // Handle number fields
    if (name === "salary" || name === "experience") {
      setFormData({
        ...formData,
        [name]: value === "" ? undefined : Number(value),
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    // If department changes, update available designations
    if (name === "department") {
      setFormData((prevData) => ({
        ...prevData,
        department: value,
        designation: "", // Reset designation when department changes
      }));
    }
  };

  // Reset form data
  const resetForm = () => {
    setFormData({});
    setIsEditing(false);
  };

  // Open the add employee modal
  const handleAddEmployee = () => {
    resetForm();
    setFormData({
      status: "Active",
      joiningDate: new Date().toISOString().split("T")[0],
    });
    setShowAddModal(true);
  };

  // Open the edit employee modal
  const handleEditEmployee = (employee: Employee) => {
    // Format date for date input
    const formattedJoiningDate = employee.joiningDate.split("T")[0];

    setFormData({
      ...employee,
      joiningDate: formattedJoiningDate,
    });

    setIsEditing(true);
    setShowAddModal(true);
  };

  // Generate employee ID
  const generateEmployeeId = () => {
    const lastEmployee = employees.slice().sort((a, b) => {
      const aNum = parseInt(a.empId.replace(/[^0-9]/g, ""));
      const bNum = parseInt(b.empId.replace(/[^0-9]/g, ""));
      return bNum - aNum;
    })[0];

    if (lastEmployee) {
      const lastId = parseInt(lastEmployee.empId.replace(/[^0-9]/g, ""));
      return `SYMB${String(lastId + 1).padStart(3, "0")}`;
    }

    return "SYMB001";
  };

  // Save employee (create or update)
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Validate required fields
      const requiredFields = [
        "name",
        "email",
        "mobile",
        "designation",
        "department",
        "joiningDate",
        "status",
      ];

      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          toast.error(
            `${field.charAt(0).toUpperCase() + field.slice(1)} is required`
          );
          setIsSaving(false);
          return;
        }
      }

      if (isEditing && formData._id) {
        // Update existing employee
        const response = await fetch(`/api/employees/${formData._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update employee");
        }

        // Update local state
        setEmployees((prevEmployees) =>
          prevEmployees.map((emp) =>
            emp._id === formData._id
              ? ({ ...emp, ...formData } as Employee)
              : emp
          )
        );

        toast.success("Employee updated successfully");
      } else {
        // Create new employee
        const newEmployeeData = {
          ...formData,
          empId: formData.empId || generateEmployeeId(),
        };

        const response = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEmployeeData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create employee");
        }

        const newEmployee = await response.json();

        // Update local state
        setEmployees((prevEmployees) => [...prevEmployees, newEmployee]);
        toast.success("Employee added successfully");
      }

      // Close the modal and reset form
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error("Error saving employee:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save employee"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete employee");
      }

      // Update local state
      setEmployees(employees.filter((emp) => emp._id !== id));

      // If the deleted employee is selected, close the detail modal
      if (selectedEmployee?._id === id) {
        setShowDetailModal(false);
      }

      toast.success("Employee deleted successfully");
    } catch (err) {
      console.error("Error deleting employee:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to delete employee"
      );
    }
  };

  // Update employee status
  const updateEmployeeStatus = async (
    id: string,
    newStatus: EmployeeStatus
  ) => {
    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update employee status");
      }

      // Update local state
      setEmployees(
        employees.map((emp) =>
          emp._id === id ? ({ ...emp, status: newStatus } as Employee) : emp
        )
      );

      // Update selected employee if it's the same one
      if (selectedEmployee?._id === id) {
        setSelectedEmployee((prev) =>
          prev ? ({ ...prev, status: newStatus } as Employee) : null
        );
      }

      toast.success(`Employee status updated to ${newStatus}`);
    } catch (err) {
      console.error("Error updating employee status:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update employee status"
      );
    }
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

  // View employee details
  const viewEmployeeDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailModal(true);
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employee data...</p>
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
            <Users className="mr-3 text-purple-600" />
            Employee Management
          </h1>
          <p className="text-gray-600">View and manage employee information</p>
        </div>

        {isAdmin && (
          <button
            onClick={handleAddEmployee}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Employee
          </button>
        )}
      </div>

      {/* Filters and search */}
      <div className="bg-white rounded-lg shadow-md p-5 mb-6 border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 justify-center flex">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-700">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, email, emp ID, designation, or department..."
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
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Contract">Contract</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>

            {/* Department Filter */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                className="block text-gray-700 w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-300"
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setCurrentPage(1); // Reset to first page on filter change
                }}
              >
                <option value="All">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.name} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Employees list */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6 border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead>
              <tr>
                {[
                  "Emp ID",
                  "Employee",
                  "Department",
                  "Designation",
                  "Joining Date",
                  "Status",
                  "Salary",
                  "Actions",
                ].map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedEmployees.map((employee) => (
                <tr
                  key={employee._id}
                  className="hover:bg-gray-50 transition duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {employee.empId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.name}
                        </div>
                        <div className="text-sm text-gray-700">
                          {employee.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {employee.department}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {employee.designation}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {formatDate(employee.joiningDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${
                        employee.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : employee.status === "On Leave"
                          ? "bg-yellow-100 text-yellow-800"
                          : employee.status === "Contract"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(employee.salary)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewEmployeeDetails(employee)}
                        className="text-purple-600 hover:text-purple-800 flex items-center transition"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleEditEmployee(employee)}
                            className="text-blue-600 hover:text-blue-800 flex items-center transition"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </button>

                          <button
                            onClick={() => handleDeleteEmployee(employee._id)}
                            className="text-red-600 hover:text-red-800 flex items-center transition"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedEmployees.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-4 text-center text-gray-700"
                  >
                    No employees found matching your criteria
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
            {filteredEmployees.length > 0
              ? (currentPage - 1) * employeesPerPage + 1
              : 0}
          </span>{" "}
          to{" "}
          <span className="font-medium">
            {Math.min(currentPage * employeesPerPage, filteredEmployees.length)}
          </span>{" "}
          of <span className="font-medium">{filteredEmployees.length}</span>{" "}
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
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 
            hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed 
            flex items-center transition duration-300"
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Employee detail modal */}
      {showDetailModal && selectedEmployee && (
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
                  <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                    <User className="w-5 h-5 mr-2 text-purple-600" />
                    Employee Details
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
                      <div className="flex-shrink-0 h-16 w-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl font-bold">
                        {selectedEmployee.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-medium text-gray-900">
                          {selectedEmployee.name}
                        </h4>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-3">
                            {selectedEmployee.designation}
                          </span>
                          <span className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded">
                            {selectedEmployee.empId}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 md:mt-0">
                      <span
                        className={`px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full  
                        ${
                          selectedEmployee.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : selectedEmployee.status === "On Leave"
                            ? "bg-yellow-100 text-yellow-800"
                            : selectedEmployee.status === "Contract"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedEmployee.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">
                        Personal Information
                      </h5>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />

                          <a
                            href={`mailto:${selectedEmployee.email}`}
                            className="text-gray-700 hover:text-purple-600"
                          >
                            {selectedEmployee.email}
                          </a>
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />

                          <a
                            href={`tel:${selectedEmployee.mobile}`}
                            className="text-gray-700 hover:text-purple-600"
                          >
                            {selectedEmployee.mobile}
                          </a>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-700">
                            {selectedEmployee.address}, {selectedEmployee.city}
                          </span>
                        </div>
                        {selectedEmployee.emergencyContact && (
                          <div className="flex items-start">
                            <Phone className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                            <div>
                              <span className="text-xs text-gray-500 block">
                                Emergency Contact
                              </span>
                              <span className="text-gray-700">
                                {selectedEmployee.emergencyContact}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">
                        Professional Details
                      </h5>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center">
                          <Briefcase className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <span className="text-xs text-gray-500 block">
                              Designation
                            </span>
                            <span className="text-gray-700">
                              {selectedEmployee.designation}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Building className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <span className="text-xs text-gray-500 block">
                              Department
                            </span>
                            <span className="text-gray-700">
                              {selectedEmployee.department}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <span className="text-xs text-gray-500 block">
                              Joining Date
                            </span>
                            <span className="text-gray-700">
                              {formatDate(selectedEmployee.joiningDate)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <IndianRupee className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <span className="text-xs text-gray-500 block">
                              Salary
                            </span>
                            <span className="text-gray-700">
                              {formatCurrency(selectedEmployee.salary)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">
                        Bank Details
                      </h5>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        {selectedEmployee.accountNumber && (
                          <div className="flex items-center">
                            <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <span className="text-xs text-gray-500 block">
                                Account Number
                              </span>
                              <span className="text-gray-700">
                                {selectedEmployee.accountNumber}
                              </span>
                            </div>
                          </div>
                        )}
                        {selectedEmployee.ifscCode && (
                          <div className="flex items-center">
                            <Landmark className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <span className="text-xs text-gray-500 block">
                                IFSC Code
                              </span>
                              <span className="text-gray-700">
                                {selectedEmployee.ifscCode}
                              </span>
                            </div>
                          </div>
                        )}
                        {!selectedEmployee.accountNumber &&
                          !selectedEmployee.ifscCode && (
                            <div className="text-gray-500 text-sm">
                              No bank details available
                            </div>
                          )}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">
                        Qualifications
                      </h5>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <Award className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <span className="text-xs text-gray-500 block">
                              Experience
                            </span>
                            <span className="text-gray-700">
                              {selectedEmployee.experience} years
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start">
                          <Briefcase className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                          <div>
                            <span className="text-xs text-gray-500 block">
                              Education
                            </span>
                            <span className="text-gray-700">
                              {selectedEmployee.education || "Not specified"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <div className="flex items-center space-x-4">
                  {/* Status Selection Dropdown */}
                  {isAdmin && (
                    <div className="relative flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">
                        Status:
                      </label>
                      <div className="relative">
                        <select
                          value={selectedEmployee.status}
                          onChange={(e) => {
                            setSelectedEmployee((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    status: e.target.value as EmployeeStatus,
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
                          <ChevronLeft className="h-4 w-4 -rotate-90" />
                        </div>
                      </div>

                      {/* Save Status Button */}
                      <button
                        onClick={() =>
                          updateEmployeeStatus(
                            selectedEmployee._id,
                            selectedEmployee.status
                          )
                        }
                        className="inline-flex items-center justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:text-sm transition duration-300 ease-in-out"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Save Status
                      </button>
                    </div>
                  )}

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

      {/* Add/Edit Employee Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
              resetForm();
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
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {isEditing ? "Edit Employee" : "Add New Employee"}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form
                  onSubmit={handleSaveEmployee}
                  className="overflow-y-auto max-h-[70vh]"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Basic Information
                      </h4>
                      <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                        <div>
                          <label
                            htmlFor="name"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Full Name*
                          </label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name || ""}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="empId"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Employee ID
                            {isEditing ? "" : " (auto-generated if empty)"}
                          </label>
                          <input
                            type="text"
                            id="empId"
                            name="empId"
                            value={formData.empId || ""}
                            onChange={handleInputChange}
                            disabled={isEditing}
                            className={`mt-1 block w-full border border-gray-300 text-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                              isEditing ? "bg-gray-100" : ""
                            }`}
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Email Address*
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email || ""}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="mobile"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Mobile Number*
                          </label>
                          <input
                            type="text"
                            id="mobile"
                            name="mobile"
                            value={formData.mobile || ""}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Professional Information */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Professional Information
                      </h4>
                      <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
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
                            value={formData.department || ""}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          >
                            <option value="">Select Department</option>
                            {departments.map((dept) => (
                              <option key={dept.name} value={dept.name}>
                                {dept.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="designation"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Designation*
                          </label>
                          <select
                            id="designation"
                            name="designation"
                            value={formData.designation || ""}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          >
                            <option value="">Select Designation</option>
                            {formData.department &&
                            departmentDesignations[formData.department] ? (
                              departmentDesignations[formData.department].map(
                                (designation) => (
                                  <option key={designation} value={designation}>
                                    {designation}
                                  </option>
                                )
                              )
                            ) : (
                              <option value="">Select department first</option>
                            )}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="joiningDate"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Joining Date*
                          </label>
                          <input
                            type="date"
                            id="joiningDate"
                            name="joiningDate"
                            value={formData.joiningDate || ""}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="salary"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Salary (INR)*
                          </label>
                          <input
                            type="number"
                            id="salary"
                            name="salary"
                            value={formData.salary || ""}
                            onChange={handleInputChange}
                            min="0"
                            step="1000"
                            className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address Information */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Address Information
                      </h4>
                      <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                        <div>
                          <label
                            htmlFor="address"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Address
                          </label>
                          <input
                            type="text"
                            id="address"
                            name="address"
                            value={formData.address || ""}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="city"
                            className="block text-sm font-medium text-gray-700"
                          >
                            City
                          </label>
                          <input
                            type="text"
                            id="city"
                            name="city"
                            value={formData.city || ""}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="emergencyContact"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Emergency Contact
                          </label>
                          <input
                            type="text"
                            id="emergencyContact"
                            name="emergencyContact"
                            value={formData.emergencyContact || ""}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bank Details and Status */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Bank Details
                      </h4>
                      <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                        <div>
                          <label
                            htmlFor="accountNumber"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Bank Account Number
                          </label>
                          <input
                            type="text"
                            id="accountNumber"
                            name="accountNumber"
                            value={formData.accountNumber || ""}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="ifscCode"
                            className="block text-sm font-medium text-gray-700"
                          >
                            IFSC Code
                          </label>
                          <input
                            type="text"
                            id="ifscCode"
                            name="ifscCode"
                            value={formData.ifscCode || ""}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="status"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Status*
                          </label>
                          <select
                            id="status"
                            name="status"
                            value={formData.status || "Active"}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Qualifications */}
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Qualifications
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                        <div>
                          <label
                            htmlFor="education"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Education
                          </label>
                          <input
                            type="text"
                            id="education"
                            name="education"
                            value={formData.education || ""}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="experience"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Experience (Years)
                          </label>
                          <input
                            type="number"
                            id="experience"
                            name="experience"
                            value={formData.experience || ""}
                            onChange={handleInputChange}
                            min="0"
                            className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        resetForm();
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
                          {isEditing ? "Update" : "Save"}
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
