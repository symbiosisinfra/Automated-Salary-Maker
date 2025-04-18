// types/career.ts

// Possible status values for a career application
export type CareerStatus =
  | "New"
  | "In Review"
  | "Shortlisted"
  | "Scheduled"
  | "Interviewed"
  | "Technical Round"
  | "HR Round"
  | "Background Check"
  | "Offer Sent"
  | "Negotiation"
  | "Offer Accepted"
  | "Hired"
  | "Rejected"
  | "Placed"
  | "On Hold"
  | "Withdrawn";

// Career application interface matching MongoDB structure
export interface CareerApplication {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  currentCompany: string;
  currentCtc: string;
  expectedCtc: string;
  earliestStartDate: string;
  role: string;
  resume: string;
  status?: CareerStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// Career application update payload
export interface CareerUpdatePayload {
  status?: CareerStatus;
  notes?: string;
  [key: string]: any; // Allow other fields to be updated
}

// Status option with color information for UI
export interface StatusOption {
  value: CareerStatus;
  label: string;
  color: string;
  bgColor: string;
}

// Define status options with UI colors
export const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "New",
    label: "New",
    color: "text-purple-800",
    bgColor: "bg-purple-100",
  },
  {
    value: "In Review",
    label: "In Review",
    color: "text-purple-800",
    bgColor: "bg-purple-100",
  },
  {
    value: "Shortlisted",
    label: "Shortlisted",
    color: "text-green-800",
    bgColor: "bg-green-100",
  },
  {
    value: "Scheduled",
    label: "Scheduled",
    color: "text-amber-800",
    bgColor: "bg-amber-100",
  },
  {
    value: "Interviewed",
    label: "Interviewed",
    color: "text-indigo-800",
    bgColor: "bg-indigo-100",
  },
  {
    value: "Technical Round",
    label: "Technical Round",
    color: "text-purple-800",
    bgColor: "bg-purple-100",
  },
  {
    value: "HR Round",
    label: "HR Round",
    color: "text-purple-800",
    bgColor: "bg-purple-100",
  },
  {
    value: "Background Check",
    label: "Background Check",
    color: "text-gray-800",
    bgColor: "bg-gray-100",
  },
  {
    value: "Offer Sent",
    label: "Offer Sent",
    color: "text-yellow-800",
    bgColor: "bg-yellow-100",
  },
  {
    value: "Negotiation",
    label: "Negotiation",
    color: "text-orange-800",
    bgColor: "bg-orange-100",
  },
  {
    value: "Offer Accepted",
    label: "Offer Accepted",
    color: "text-purple-800",
    bgColor: "bg-purple-100",
  },
  {
    value: "Hired",
    label: "Hired",
    color: "text-purple-900",
    bgColor: "bg-purple-200",
  },
  {
    value: "Rejected",
    label: "Rejected",
    color: "text-red-800",
    bgColor: "bg-red-100",
  },
  {
    value: "Placed",
    label: "Placed",
    color: "text-lime-800",
    bgColor: "bg-lime-100",
  },
  {
    value: "On Hold",
    label: "On Hold",
    color: "text-gray-800",
    bgColor: "bg-gray-200",
  },
  {
    value: "Withdrawn",
    label: "Withdrawn",
    color: "text-stone-800",
    bgColor: "bg-stone-100",
  },
];
// Get combined CSS class for a status
export const getStatusClass = (status: CareerStatus | undefined): string => {
  const option = STATUS_OPTIONS.find((opt) => opt.value === status);
  return option
    ? `${option.bgColor} ${option.color}`
    : "bg-gray-100 text-gray-800";
};

// Get all available roles from the career applications
export const getAvailableRoles = (
  applications: CareerApplication[]
): string[] => {
  const roles = new Set<string>();
  applications.forEach((app) => {
    if (app.role) {
      roles.add(app.role);
    }
  });
  return Array.from(roles).sort();
};

// Format date for display
export const formatDate = (dateString: string | Date | undefined): string => {
  if (!dateString) return "-";
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "-"; // Invalid date

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Format currency
export const formatCurrency = (value: string | number | undefined): string => {
  if (!value) return "-";
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return value.toString();

  // Check if the value is already in lakhs (e.g. "4.5 LPA" or "4 lack")
  const stringValue = value.toString().toLowerCase();
  if (
    stringValue.includes("lpa") ||
    stringValue.includes("lack") ||
    stringValue.includes("lakhs")
  ) {
    return stringValue;
  }

  // Format the number
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numValue);

  return formatted;
};

// Get filename from URL
export const getFilenameFromUrl = (url: string): string => {
  if (!url) return "";

  try {
    // Extract the filename from the URL
    const urlParts = url.split("/");
    const filename = urlParts[urlParts.length - 1];

    // Decode URI component to handle special characters
    const decodedFilename = decodeURIComponent(filename);

    return decodedFilename;
  } catch (error) {
    console.error("Error extracting filename from URL:", error);
    return "resume";
  }
};
