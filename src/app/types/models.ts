// app/types/models.ts - Updated Employee interface
export interface Employee {
  _id: string;
  empId: string; // Unique employee ID (SYMB001, SYMB002, etc.)
  name: string; // Full name of the employee
  email: string; // Email address
  mobile: string; // Mobile number
  designation: string; // Job title/position
  department: string; // Department name
  joiningDate: string; // Date of joining (ISO string)
  salary: number; // Salary amount
  address: string; // Physical address
  city: string; // City of residence
  status: EmployeeStatus; // Current status (Active, On Leave, etc.)
  emergencyContact?: string; // Emergency contact number
  education?: string; // Educational qualifications
  experience?: number; // Years of experience
  accountNumber?: string; // Bank account number
  ifscCode?: string; // IFSC code for bank branch
  createdAt: string; // Record creation date (ISO string)
  updatedAt?: string; // Record last update date (ISO string)
}

// Employee status types
export type EmployeeStatus = "Active" | "On Leave" | "Contract" | "Terminated";

export const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "On Leave", label: "On Leave" },
  { value: "Contract", label: "Contract" },
  { value: "Terminated", label: "Terminated" },
];

export interface Department {
  _id: string; // Unique identifier
  name: string; // Department name (e.g., Sales, Marketing)
  description?: string; // Description of the department
  active: boolean; // Whether the department is active or not
  createdAt: string; // Record creation date (ISO string)
  updatedAt?: string; // Record last update date (ISO string)
}

export interface DepartmentOption {
  value: string; // Department name used as value
  label: string; // Department name displayed to users
}

export interface Designation {
  _id: string; // Unique identifier
  name: string; // Designation/job title name (e.g., Sales Manager)
  department: string; // Department this designation belongs to
  description?: string; // Description of the designation
  active: boolean; // Whether the designation is active or not
  createdAt: string; // Record creation date (ISO string)
  updatedAt?: string; // Record last update date (ISO string)
}

export interface DesignationOption {
  value: string; // Designation name used as value
  label: string; // Designation name displayed to users
  department: string; // Department this designation belongs to
}
