// lib/utils.ts

/**
 * Format date as string in user's locale
 */
export function formatDate(
  dateString?: string | Date | null,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }
): string {
  if (!dateString) return "-";

  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;

  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", options).format(date);
}

/**
 * Format currency with proper decimal places and symbol
 */
export function formatCurrency(
  amount: number,
  currency = "INR",
  decimals = 0
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Generate placeholder Avatar URL based on name
 */
export function getAvatarUrl(name: string): string {
  const initials = name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .substring(0, 2);

  // This is just a placeholder - in a real app you'd use a real avatar API
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=0D8ABC&color=fff&size=256`;
}

/**
 * Extract name initials
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Truncate long text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

/**
 * Classify status for theming (colors, etc)
 */
export function getStatusColorClass(status: string): string {
  const statusLower = status.toLowerCase();

  if (
    statusLower.includes("active") ||
    statusLower.includes("approved") ||
    statusLower.includes("success") ||
    statusLower.includes("complete") ||
    statusLower.includes("present")
  ) {
    return "bg-green-100 text-green-800";
  }

  if (
    statusLower.includes("pending") ||
    statusLower.includes("in progress") ||
    statusLower.includes("waiting") ||
    statusLower.includes("review")
  ) {
    return "bg-yellow-100 text-yellow-800";
  }

  if (
    statusLower.includes("error") ||
    statusLower.includes("failed") ||
    statusLower.includes("rejected") ||
    statusLower.includes("inactive") ||
    statusLower.includes("absent")
  ) {
    return "bg-red-100 text-red-800";
  }

  if (statusLower.includes("wfh") || statusLower.includes("home")) {
    return "bg-purple-100 text-purple-800";
  }

  if (
    statusLower.includes("leave") ||
    statusLower.includes("cl") ||
    statusLower.includes("casual")
  ) {
    return "bg-purple-100 text-purple-800";
  }

  if (statusLower.includes("off") || statusLower.includes("holiday")) {
    return "bg-gray-100 text-gray-800";
  }

  return "bg-gray-100 text-gray-800"; // Default
}

/**
 * Download data as file
 */
export function downloadAsFile(
  filename: string,
  content: string,
  type: string
): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format time from 24-hour to 12-hour format
 */
export function formatTime(time24: string): string {
  if (!time24 || !time24.includes(":")) return time24;

  const [hourStr, minuteStr] = time24.split(":");
  const hour = parseInt(hourStr, 10);

  if (isNaN(hour)) return time24;

  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minuteStr} ${period}`;
}

/**
 * Calculate difference between two times in minutes
 */
export function getTimeDifferenceInMinutes(
  startTime: string,
  endTime: string
): number {
  if (
    !startTime ||
    !endTime ||
    !startTime.includes(":") ||
    !endTime.includes(":")
  ) {
    return 0;
  }

  const [startHourStr, startMinuteStr] = startTime.split(":");
  const [endHourStr, endMinuteStr] = endTime.split(":");

  const startHour = parseInt(startHourStr, 10);
  const startMinute = parseInt(startMinuteStr, 10);
  const endHour = parseInt(endHourStr, 10);
  const endMinute = parseInt(endMinuteStr, 10);

  if (
    isNaN(startHour) ||
    isNaN(startMinute) ||
    isNaN(endHour) ||
    isNaN(endMinute)
  ) {
    return 0;
  }

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  return endTotalMinutes - startTotalMinutes;
}

/**
 * Generate a random ID
 */
export function generateId(prefix = ""): string {
  return `${prefix}${Math.random().toString(36).substring(2, 11)}`;
}
