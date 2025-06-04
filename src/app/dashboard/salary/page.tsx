"use client";
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Calendar,
  FileInput,
  User,
  Briefcase,
  File,
  FileSpreadsheet,
  Info,
  Users,
  FilePlus,
  Check,
  X,
  Clock,
} from "lucide-react";

// Types
interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
  attendance: Record<string, DayAttendance>;
  calculation: SalaryCalculation;
  manualLateBufferDays: string[]; // For late arrivals
  manualEarlyBufferDays: string[]; // For early departures
}

interface DayAttendance {
  date: string;
  inTime: string | null;
  outTime: string | null;
  status: "Present" | "Absent" | "WFH" | "Week Off" | "CL" | "Holiday";
  deficitMinutes: number;
  isLate?: boolean;
  lateBy?: number;
  isEarly?: boolean;
  earlyBy?: number;
}

// Final SalaryCalculation interface with absent day deductions
interface SalaryCalculation {
  totalDays: number;
  workingDays: number;
  presentDays: number;
  wfhDays: number;
  weekOffDays: number;
  absentDays: number;
  clDays: number;
  holidayDays: number;
  totalDeficitMinutes: number;
  lateBufferApplied: number;
  earlyBufferApplied: number;
  totalBufferApplied: number;
  daysWithLateBuffer: string[];
  daysWithEarlyBuffer: string[];
  finalDeficit: number;
  perDaySalary: number;
  absentDeduction: number;
  deficitDeduction: number;
  pipDeduction: number;
  deduction: number;
  finalSalary: number;
  perMinuteRate: number;
  isPIP: boolean;

  // New properties for special cases
  isSpecialDepartment?: boolean; // RUNNER, PANTRY BOY, PANTRY GIRL
  isKishan?: boolean; // Special employee Kishan
  totalWorkedMinutes?: number; // Total minutes worked for special departments
  totalExtraMinutes?: number; // Extra minutes beyond standard hours
  specialDepartmentSalary?: number; // Salary based on minutes for special departments
}

// Constants
const EXPECTED_WORK_MINUTES = 510; // 8.5 hours = 510 minutes
const BUFFER_MINUTES = 15; // 15 minutes buffer per day
const MAX_BUFFER_DAYS = 3; // 3 days per month for each type (late/early)
const DEFAULT_SALARY = 0; // Default salary if not provided

// Office hours constants for logical time correction
const OFFICE_START_HOUR = 10; // Office starts at 10:00 AM
const OFFICE_END_HOUR = 18; // Office ends at 18:30 (6:30 PM)
const OFFICE_END_MINUTE = 30;

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [maxDaysInMonth, setMaxDaysInMonth] = useState<number>(31);
  const [exportLoading, setExportLoading] = useState(false);
  const [month, setMonth] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [employeeFilter, setEmployeeFilter] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Function to toggle late buffer for a specific day
  const toggleLateBufferForDay = (day: string) => {
    if (!selectedEmployee) return;

    // Create a copy of the selected employee
    const updatedEmployee = { ...selectedEmployee };

    // Check if this day is already in the buffer days array
    const index = updatedEmployee.manualLateBufferDays.indexOf(day);

    if (index === -1) {
      // If we're already at the max buffer days, don't add more
      if (updatedEmployee.manualLateBufferDays.length >= MAX_BUFFER_DAYS) {
        alert(
          `You can only select up to ${MAX_BUFFER_DAYS} days for late arrival buffer.`
        );
        return;
      }

      // Add the day to buffer days
      updatedEmployee.manualLateBufferDays.push(day);
    } else {
      // Remove the day from buffer days
      updatedEmployee.manualLateBufferDays.splice(index, 1);
    }

    // Recalculate the salary with the new buffer days
    updatedEmployee.calculation = calculateSalary(updatedEmployee);

    // Update the selected employee
    setSelectedEmployee(updatedEmployee);

    // Update the employee in the employees array
    const updatedEmployees = employees.map((emp) =>
      emp.id === updatedEmployee.id ? updatedEmployee : emp
    );

    setEmployees(updatedEmployees);
  };

  // Function to toggle early buffer for a specific day
  const toggleEarlyBufferForDay = (day: string) => {
    if (!selectedEmployee) return;

    // Create a copy of the selected employee
    const updatedEmployee = { ...selectedEmployee };

    // Check if this day is already in the buffer days array
    const index = updatedEmployee.manualEarlyBufferDays.indexOf(day);

    if (index === -1) {
      // If we're already at the max buffer days, don't add more
      if (updatedEmployee.manualEarlyBufferDays.length >= MAX_BUFFER_DAYS) {
        alert(
          `You can only select up to ${MAX_BUFFER_DAYS} days for early departure buffer.`
        );
        return;
      }

      // Add the day to buffer days
      updatedEmployee.manualEarlyBufferDays.push(day);
    } else {
      // Remove the day from buffer days
      updatedEmployee.manualEarlyBufferDays.splice(index, 1);
    }

    // Recalculate the salary with the new buffer days
    updatedEmployee.calculation = calculateSalary(updatedEmployee);

    // Update the selected employee
    setSelectedEmployee(updatedEmployee);

    // Update the employee in the employees array
    const updatedEmployees = employees.map((emp) =>
      emp.id === updatedEmployee.id ? updatedEmployee : emp
    );

    setEmployees(updatedEmployees);
  };

  // Process file upload with manual buffer selection
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // Extract month and year from filename (if follows pattern)
      const filenameParts = file.name.split("_");
      if (filenameParts.length > 1) {
        // Try to extract month and year if filename follows a pattern like "Attendance_Jan_2025.xlsx"
        const monthYearPart = filenameParts[1];
        if (monthYearPart) {
          const dateParts = monthYearPart.split(".");
          setMonth(dateParts[0] || "");

          // If there's a year part as well
          if (filenameParts.length > 2) {
            setYear(
              filenameParts[2].split(".")[0] ||
                new Date().getFullYear().toString()
            );
          } else {
            setYear(new Date().getFullYear().toString());
          }
        }
      }

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, {
        type: "array",
        cellDates: true,
        dateNF: "HH:mm",
      });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Dynamically detect the number of days in the month based on columns
      const daysInMonth = detectDaysInMonth(jsonData);
      setMaxDaysInMonth(daysInMonth);

      // Process the data to extract employees and their attendance
      const extractedEmployees = processEmployeeData(jsonData, daysInMonth);
      setEmployees(extractedEmployees);

      // Select the first employee by default if available
      if (extractedEmployees.length > 0) {
        setSelectedEmployee(extractedEmployees[0]);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Error processing file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Detect days in month dynamically based on column headers
  const detectDaysInMonth = (data: any[]): number => {
    if (data.length === 0) return 31; // Default to 31 if no data

    // Get the first row to analyze columns
    const firstRow = data[0];

    // Find numeric column names that could be day numbers
    const dayColumns = Object.keys(firstRow)
      .filter((key) => {
        const parsed = parseInt(key, 10);
        return !isNaN(parsed) && parsed > 0 && parsed <= 31;
      })
      .map((key) => parseInt(key, 10));

    // Get the highest day number found
    return dayColumns.length > 0 ? Math.max(...dayColumns) : 31;
  };

  const calculateDeficitMinutes = (attendance: DayAttendance): number => {
    if (attendance.status !== "Present") {
      return 0; // No deficit for non-Present days
    }

    // Only count late arrivals, not early departures
    if (attendance.isLate && attendance.lateBy) {
      return attendance.lateBy;
    }

    return 0;
  };

  // Special department and employee exceptions for salary calculation
  const calculateSalary = (employee: Employee): SalaryCalculation => {
    // Count different day types
    const presentDays = Object.values(employee.attendance).filter(
      (att) => att.status === "Present"
    ).length;

    const wfhDays = Object.values(employee.attendance).filter(
      (att) => att.status === "WFH"
    ).length;

    const weekOffDays = Object.values(employee.attendance).filter(
      (att) => att.status === "Week Off"
    ).length;

    const absentDays = Object.values(employee.attendance).filter(
      (att) => att.status === "Absent"
    ).length;

    const clDays = Object.values(employee.attendance).filter(
      (att) => att.status === "CL"
    ).length;

    const holidayDays = Object.values(employee.attendance).filter(
      (att) => att.status === "Holiday"
    ).length;

    // Total days should be the actual days in the month
    const totalDays = maxDaysInMonth;

    // Calculate working days - should be totalDays minus weekends/holidays
    const workingDays = totalDays - weekOffDays - holidayDays;

    // Calculate per day salary - use actual days in month
    const perDaySalary = employee.salary / totalDays;

    // Check for special departments (RUNNER, PANTRY BOY, PANTRY GIRL)
    const isSpecialDepartment = [
      "RUNNER",
      "PANTRY BOY",
      "PANTRY GIRL",
    ].includes(employee.department.toUpperCase());

    // Check for special employee - Kishan (can leave early after 6:00 PM)
    const isKishan = employee.name.toLowerCase().includes("kishan");

    // Calculate total worked minutes and deficit minutes
    let totalWorkedMinutes = 0;
    let totalDeficitMinutes = 0;
    let totalExtraMinutes = 0; // For special departments, extra time worked

    Object.entries(employee.attendance).forEach(([day, att]) => {
      if (att.status === "Present" && att.inTime && att.outTime) {
        try {
          const inTimeParts = att.inTime.split(":").map(Number);
          const outTimeParts = att.outTime.split(":").map(Number);

          // Calculate minutes worked
          const inMinutes = inTimeParts[0] * 60 + inTimeParts[1];
          const outMinutes = outTimeParts[0] * 60 + outTimeParts[1];

          // Expected times
          const expectedInMinutes = OFFICE_START_HOUR * 60; // 10:00 AM
          const expectedOutMinutes = OFFICE_END_HOUR * 60 + OFFICE_END_MINUTE; // 18:30 PM

          // Special handling for different cases
          if (isSpecialDepartment) {
            // For special departments, count all minutes worked including before 10 AM and after 6:30 PM
            const minutesWorked = Math.max(0, outMinutes - inMinutes);
            totalWorkedMinutes += minutesWorked;

            // Also track extra minutes (beyond standard hours) for reference
            const standardMinutes = expectedOutMinutes - expectedInMinutes;
            if (minutesWorked > standardMinutes) {
              totalExtraMinutes += minutesWorked - standardMinutes;
            }
          } else {
            // Regular employees
            // Check if late or early
            const isLate = inMinutes > expectedInMinutes;
            let lateBy = isLate ? inMinutes - expectedInMinutes : 0;

            // Adjust late minutes if person worked overtime (after 6:30 PM, max till 6:45 PM)
            if (isLate && outMinutes > expectedOutMinutes) {
              const maxOvertimeMinutes = 15; // Can work max 15 minutes after 6:30 PM (till 6:45 PM)
              const actualOvertimeMinutes = Math.min(outMinutes - expectedOutMinutes, maxOvertimeMinutes);
              
              // Reduce late minutes by the overtime worked (but not below 0)
              lateBy = Math.max(0, lateBy - actualOvertimeMinutes);
            }

            // Special case for Kishan - no deduction if leaving after 6:00 PM
            const earlyKishanThreshold = (OFFICE_END_HOUR - 0.5) * 60; // 6:00 PM in minutes (18:00)

            let earlyBy = 0;
            if (outMinutes < expectedOutMinutes) {
              // For Kishan, only count early minutes if before 6:00 PM
              if (isKishan && outMinutes >= earlyKishanThreshold) {
                earlyBy = 0; // No penalty for Kishan leaving between 6:00-6:30 PM
              } else {
                earlyBy = expectedOutMinutes - outMinutes;
              }
            }

            // Add to deficit
            totalDeficitMinutes += lateBy + earlyBy;
          }
        } catch (error) {
          console.error("Error calculating minutes:", error);
        }
      }
    });

    // Calculate deduction for absent days
    const absentDeduction = Math.round(perDaySalary * absentDays);

    // MANUAL BUFFER APPLICATION LOGIC - for both late arrivals and early departures
    // Only applicable for regular employees, not special departments
    let lateBufferApplied = 0;
    let earlyBufferApplied = 0;

    if (!isSpecialDepartment) {
      // Calculate late buffer from the manually selected days
      employee.manualLateBufferDays.forEach((day) => {
        if (employee.attendance[day] && employee.attendance[day].isLate) {
          const att = employee.attendance[day];
          // Apply up to BUFFER_MINUTES of buffer (15 mins) per day
          lateBufferApplied += Math.min(att.lateBy || 0, BUFFER_MINUTES);
        }
      });

      // Calculate early buffer from the manually selected days
      employee.manualEarlyBufferDays.forEach((day) => {
        if (employee.attendance[day] && employee.attendance[day].isEarly) {
          const att = employee.attendance[day];
          // Apply up to BUFFER_MINUTES of buffer (15 mins) per day
          earlyBufferApplied += Math.min(att.earlyBy || 0, BUFFER_MINUTES);
        }
      });
    }

    // Total buffer applied
    const totalBufferApplied = lateBufferApplied + earlyBufferApplied;

    // Calculate final deficit after buffer for regular employees
    const finalDeficit = isSpecialDepartment
      ? 0
      : Math.max(0, totalDeficitMinutes - totalBufferApplied);

    // Calculate per minute rate
    const perMinuteRate =
      Math.floor((perDaySalary / EXPECTED_WORK_MINUTES) * 100) / 100;

    // Calculate deficit deduction for regular employees
    const deficitDeduction = isSpecialDepartment
      ? 0
      : Math.round(finalDeficit * perMinuteRate);

    // Special calculation for RUNNER, PANTRY BOY, PANTRY GIRL
    let specialDepartmentSalary = 0;
    if (isSpecialDepartment) {
      // Calculate salary based on total minutes worked
      specialDepartmentSalary = Math.round(totalWorkedMinutes * perMinuteRate);
    }

    // Check if employee is on PIP and apply 20% additional deduction (changed from 40%)
    const isPIP = employee.department.toLowerCase().includes("pip");
    const pipDeduction = isPIP ? Math.round(employee.salary * 0.2) : 0;

    // Total deduction and final salary
    let totalDeduction = 0;
    let finalSalary = 0;

    if (isSpecialDepartment) {
      // For special departments, salary is directly based on minutes worked
      finalSalary = specialDepartmentSalary;
      // No deductions since we're calculating salary based on minutes worked
      totalDeduction = employee.salary - specialDepartmentSalary;
    } else {
      // Regular employees - deduct absent days, deficit minutes, and PIP
      totalDeduction = absentDeduction + deficitDeduction + pipDeduction;
      finalSalary = employee.salary - totalDeduction;
    }

    return {
      totalDays,
      workingDays,
      presentDays,
      wfhDays,
      weekOffDays,
      absentDays,
      clDays,
      holidayDays,
      totalDeficitMinutes,
      lateBufferApplied,
      earlyBufferApplied,
      totalBufferApplied,
      daysWithLateBuffer: employee.manualLateBufferDays,
      daysWithEarlyBuffer: employee.manualEarlyBufferDays,
      finalDeficit,
      perDaySalary,
      absentDeduction,
      deficitDeduction,
      pipDeduction,
      deduction: totalDeduction,
      finalSalary,
      perMinuteRate,
      isPIP,
      isSpecialDepartment,
      isKishan,
      totalWorkedMinutes,
      totalExtraMinutes,
      specialDepartmentSalary,
    };
  };

  // Updated processEmployeeData function to handle mid-month joiners and include manualBufferDays
  const processEmployeeData = (
    data: any[],
    daysInMonth: number
  ): Employee[] => {
    const employees: Employee[] = [];
    let currentEmployee: Partial<Employee> | null = null;

    // Helper function to handle time formatting and parsing
    const formatTimeLogically = (timeInput: any, isOutTime = false): string => {
      if (!timeInput || timeInput === "Week off") return "";

      // Handle Excel Date objects
      if (timeInput instanceof Date) {
        const hours = timeInput.getHours();
        const minutes = timeInput.getMinutes();

        // For out times, convert AM times to PM (add 12 hours)
        const adjustedHours =
          isOutTime && hours >= 1 && hours < 12 ? hours + 12 : hours;

        // Format as HH:MM
        const formattedHours = adjustedHours.toString().padStart(2, "0");
        const formattedMinutes = minutes.toString().padStart(2, "0");
        return `${formattedHours}:${formattedMinutes}`;
      }

      // Handle string formats with special cases
      if (typeof timeInput === "string") {
        // Check for special statuses
        if (
          timeInput.includes("Week off") ||
          timeInput.toLowerCase().includes("week off")
        ) {
          return "Week off";
        }

        if (
          timeInput.includes("WFH") ||
          timeInput.toLowerCase().includes("work from home")
        ) {
          return "WFH";
        }

        if (
          timeInput === "CL" ||
          timeInput.toLowerCase().includes("casual leave")
        ) {
          return "CL";
        }
        if (
          timeInput === "Holiday" ||
          timeInput.toLowerCase().includes("holiday")
        ) {
          return "Holiday";
        }

        // Handle time formats: if already in HH:MM format
        if (timeInput.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
          // Clean up any seconds if present (e.g., 09:35:00 -> 09:35)
          const parts = timeInput.split(":");
          let hours = parseInt(parts[0], 10);
          const minutes = parts[1].padStart(2, "0");

          // For out times between 01:00 and 11:59, add 12 hours to convert to PM
          if (isOutTime && hours >= 1 && hours < 12) {
            hours += 12;
          }

          return `${hours.toString().padStart(2, "0")}:${minutes}`;
        }

        // Try to parse numeric string
        const numericValue = parseFloat(timeInput);
        if (!isNaN(numericValue)) {
          timeInput = numericValue;
        } else {
          return timeInput; // Return as is if can't parse
        }
      }

      // Handle numeric time formats
      if (typeof timeInput === "number") {
        // Extract hours and minutes
        let hours = Math.floor(timeInput);
        const minutes = Math.floor((timeInput - hours) * 100);

        // For out times between 1 and 11, add 12 hours to convert to PM
        if (isOutTime && hours >= 1 && hours < 12) {
          hours += 12;
        }

        // Format as HH:MM
        return `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}`;
      }

      // Default case - return as is
      return String(timeInput);
    };

    // Process each row to find employees and their attendance
    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      const parseSalary = (salaryValue: any): number => {
        if (salaryValue === undefined || salaryValue === null)
          return DEFAULT_SALARY;

        // Convert to string and trim whitespace if it's a string
        let cleanedValue =
          typeof salaryValue === "string" ? salaryValue.trim() : salaryValue;

        // Try to parse the number
        const num = Number(cleanedValue);

        // Log for debugging
        console.log(
          `Parsing salary: "${salaryValue}" -> "${cleanedValue}" -> ${num}`
        );

        return isNaN(num) ? DEFAULT_SALARY : num;
      };

      // Check if this is an employee row (has employee information)
      if (row["Employee Name"] && row["S. No. "] !== undefined) {
        // Create new employee object
        currentEmployee = {
          id: row["S. No. "],
          name: row["Employee Name"],
          department: row["Department"] || "",
          salary: parseSalary(row["Salary"]),
          attendance: {},
          manualLateBufferDays: [], // Initialize with empty array for late buffer
          manualEarlyBufferDays: [], // Initialize with empty array for early buffer
          calculation: {
            totalDays: 0,
            workingDays: 0,
            presentDays: 0,
            wfhDays: 0,
            weekOffDays: 0,
            absentDays: 0,
            clDays: 0,
            totalDeficitMinutes: 0,
            lateBufferApplied: 0,
            earlyBufferApplied: 0,
            totalBufferApplied: 0,
            daysWithLateBuffer: [],
            daysWithEarlyBuffer: [],
            finalDeficit: 0,
            deduction: 0,
            finalSalary: 0,
            perMinuteRate: 0,
            holidayDays: 0,
          },
        };

        // Process in times for all days
        for (let day = 1; day <= daysInMonth; day++) {
          const dayKey = day.toString();
          if (row[day] !== undefined) {
            // Determine status based on the value
            let status:
              | "Present"
              | "Absent"
              | "WFH"
              | "Week Off"
              | "CL"
              | "Holiday" = "Present";

            if (typeof row[day] === "string") {
              const cellValue = row[day].toString();

              if (
                cellValue.includes("Week off") ||
                cellValue.toLowerCase().includes("week off")
              ) {
                status = "Week Off";
              } else if (
                cellValue.includes("WFH") ||
                cellValue.toLowerCase().includes("work from home")
              ) {
                status = "WFH";
              } else if (
                cellValue === "CL" ||
                cellValue.toLowerCase().includes("cl") ||
                cellValue.toLowerCase().includes("casual leave")
              ) {
                status = "CL";
              } else if (
                cellValue === "Holiday" ||
                cellValue.toLowerCase().includes("holiday")
              ) {
                status = "Holiday";
              }
            }

            // Initialize attendance for this day
            let inTimeValue = row[day];

            if (!currentEmployee.attendance) currentEmployee.attendance = {};
            currentEmployee.attendance[dayKey] = {
              date: `Day ${day}`,
              inTime: formatTimeLogically(inTimeValue, false),
              outTime: null, // Will be filled from the next row
              status,
              deficitMinutes: 0, // Will be calculated later
            };
          } else {
            // Handle days with no value - important for mid-month joiners
            // If cell is empty, set as Absent for days before they joined
            if (!currentEmployee.attendance) currentEmployee.attendance = {};

            // Only add if the day doesn't already exist in attendance
            if (!currentEmployee.attendance[dayKey]) {
              currentEmployee.attendance[dayKey] = {
                date: `Day ${day}`,
                inTime: null,
                outTime: null,
                status: "Absent", // Mark as absent for days before joining
                deficitMinutes: 0, // No deficit for days before joining
              };
            }
          }
        }

        // Check for out times in the next row
        if (i + 1 < data.length && data[i + 1]["In/Out Time"] === "Out Time") {
          const outRow = data[i + 1];

          // Process out times for all days
          for (let day = 1; day <= daysInMonth; day++) {
            const dayKey = day.toString();
            if (
              currentEmployee.attendance &&
              currentEmployee.attendance[dayKey] &&
              currentEmployee.attendance[dayKey].status === "Present" // Only process out times for present days
            ) {
              let outTimeValue = outRow[day];

              // Dynamic handling for any problematic out time
              try {
                const formattedTime = formatTimeLogically(outTimeValue, true);
                // Check if the formatted time contains NaN or is invalid
                if (formattedTime.includes("NaN") || !formattedTime) {
                  // If this is a present day (not a Week Off or WFH or other status)
                  const currentStatus =
                    currentEmployee.attendance[dayKey].status;
                  if (currentStatus === "Present") {
                    // Use office end time as default value
                    // Format as HH:MM using the office end constants
                    const endHour = OFFICE_END_HOUR.toString().padStart(2, "0");
                    const endMinute = OFFICE_END_MINUTE.toString().padStart(
                      2,
                      "0"
                    );
                    outTimeValue = `${endHour}:${endMinute}`;
                  }
                }
              } catch (error) {
                // In case of error, use office end time as fallback
                // Only apply this to present days
                if (currentEmployee.attendance[dayKey].status === "Present") {
                  const endHour = OFFICE_END_HOUR.toString().padStart(2, "0");
                  const endMinute = OFFICE_END_MINUTE.toString().padStart(
                    2,
                    "0"
                  );
                  outTimeValue = `${endHour}:${endMinute}`;

                  // Log the error for debugging
                  console.warn(
                    `Invalid out time fixed for employee ${currentEmployee.name} on day ${day}`,
                    error
                  );
                }
              }

              // Apply the formatted time
              currentEmployee.attendance[dayKey].outTime = formatTimeLogically(
                outTimeValue,
                true
              );
            }
          }

          // Skip the out-time row in the next iteration
          i++;
        }

        // Calculate deficits for each day and add metadata for late/early
        if (currentEmployee.attendance) {
          Object.keys(currentEmployee.attendance).forEach((day) => {
            const attendance = currentEmployee.attendance![day];

            // Handle different status types
            if (
              attendance.status === "Week Off" ||
              attendance.status === "WFH" ||
              attendance.status === "CL" ||
              attendance.status === "Holiday" // Add this condition
            ) {
              // No deficit for week off, WFH, or CL (paid leave)
              attendance.deficitMinutes = 0;
              attendance.isLate = false;
              attendance.lateBy = 0;
              attendance.isEarly = false;
              attendance.earlyBy = 0;
            } else if (!attendance.inTime || !attendance.outTime) {
              // Missing in or out time = absent (full day deficit)
              attendance.status = "Absent";
              attendance.deficitMinutes = EXPECTED_WORK_MINUTES;
              attendance.isLate = false;
              attendance.lateBy = 0;
              attendance.isEarly = false;
              attendance.earlyBy = 0;
            } else {
              // Calculate work time with robust time parsing
              try {
                const inTimeParts = attendance.inTime.split(":").map(Number);
                const outTimeParts = attendance.outTime.split(":").map(Number);

                // Validate parsed times
                if (
                  inTimeParts.length !== 2 ||
                  outTimeParts.length !== 2 ||
                  inTimeParts.some(isNaN) ||
                  outTimeParts.some(isNaN)
                ) {
                  // If time parsing fails, mark as absent
                  attendance.status = "Absent";
                  attendance.deficitMinutes = EXPECTED_WORK_MINUTES;
                  attendance.isLate = false;
                  attendance.lateBy = 0;
                  attendance.isEarly = false;
                  attendance.earlyBy = 0;
                  return;
                }

                const inMinutes = inTimeParts[0] * 60 + inTimeParts[1];
                const outMinutes = outTimeParts[0] * 60 + outTimeParts[1];

                // Calculate expected in and out times
                const expectedInMinutes = OFFICE_START_HOUR * 60; // 10:00 AM
                const expectedOutMinutes =
                  OFFICE_END_HOUR * 60 + OFFICE_END_MINUTE; // 18:30 PM

                // Check if late or early
                const isLate = inMinutes > expectedInMinutes;
                let lateBy = isLate ? inMinutes - expectedInMinutes : 0;

                // Adjust late minutes if person worked overtime (after 6:30 PM, max till 6:45 PM)
                if (isLate && outMinutes > expectedOutMinutes) {
                  const maxOvertimeMinutes = 15; // Can work max 15 minutes after 6:30 PM (till 6:45 PM)
                  const actualOvertimeMinutes = Math.min(outMinutes - expectedOutMinutes, maxOvertimeMinutes);
                  
                  // Reduce late minutes by the overtime worked (but not below 0)
                  lateBy = Math.max(0, lateBy - actualOvertimeMinutes);
                }

                const isEarly = outMinutes < expectedOutMinutes;
                const earlyBy = isEarly ? expectedOutMinutes - outMinutes : 0;

                // Calculate deficit
                let deficitMinutes = lateBy + earlyBy;

                // Set attendance properties
                attendance.deficitMinutes = deficitMinutes;
                attendance.isLate = isLate;
                attendance.lateBy = lateBy;
                attendance.isEarly = isEarly;
                attendance.earlyBy = earlyBy;
              } catch (error) {
                // If any calculation error occurs, default to absent
                attendance.status = "Absent";
                attendance.deficitMinutes = EXPECTED_WORK_MINUTES;
                attendance.isLate = false;
                attendance.lateBy = 0;
                attendance.isEarly = false;
                attendance.earlyBy = 0;
              }
            }
          });
        }

        // Calculate salary with buffer application
        if (currentEmployee.attendance && currentEmployee.id !== undefined) {
          const calculation = calculateSalary(currentEmployee as Employee);
          currentEmployee.calculation = calculation;
        }

        // Add the employee to our array
        if (currentEmployee.id !== undefined && currentEmployee.name) {
          employees.push(currentEmployee as Employee);
        }
      }
    }

    return employees;
  };

  // Complete Export to Excel (for single employee)
  const exportToExcel = () => {
    if (!selectedEmployee) return;

    setExportLoading(true);

    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Check if this is a special department employee
      const isSpecialDepartment =
        selectedEmployee.calculation.isSpecialDepartment;
      const isKishan = selectedEmployee.calculation.isKishan;

      // Prepare employee summary data
      const summaryData = [
        ["Employee Name", selectedEmployee.name],
        ["Department", selectedEmployee.department],
        ["Base Salary", `₹${selectedEmployee.salary.toLocaleString("en-IN")}`],
      ];

      // Add special status indicators if applicable
      if (isSpecialDepartment) {
        summaryData.push([
          "Special Department",
          "Yes - Paid by minutes worked",
        ]);
      }
      if (isKishan) {
        summaryData.push([
          "Special Employee",
          "Yes - Kishan can leave after 6:00 PM",
        ]);
      }

      summaryData.push([""]); // Empty row

      // Add attendance summary
      summaryData.push(["ATTENDANCE SUMMARY"]);
      summaryData.push(["Total Days", selectedEmployee.calculation.totalDays]);
      summaryData.push([
        "Working Days",
        selectedEmployee.calculation.workingDays,
      ]);
      summaryData.push([
        "Present Days",
        selectedEmployee.calculation.presentDays,
      ]);
      summaryData.push(["WFH Days", selectedEmployee.calculation.wfhDays]);
      summaryData.push([
        "Week Off Days",
        selectedEmployee.calculation.weekOffDays,
      ]);
      summaryData.push([
        "Absent Days",
        selectedEmployee.calculation.absentDays,
      ]);
      summaryData.push(["CL Days", selectedEmployee.calculation.clDays]);
      summaryData.push([
        "Holiday Days",
        selectedEmployee.calculation.holidayDays,
      ]);

      summaryData.push([""]); // Empty row

      // Add salary calculation section
      summaryData.push(["SALARY CALCULATION"]);

      if (isSpecialDepartment) {
        // Special department salary calculation
        summaryData.push([
          "Total Minutes Worked",
          `${selectedEmployee.calculation.totalWorkedMinutes} mins`,
        ]);
        summaryData.push([
          "Extra Minutes Beyond Standard",
          `${selectedEmployee.calculation.totalExtraMinutes} mins`,
        ]);
        summaryData.push([
          "Standard Work Minutes (if full days)",
          `${
            EXPECTED_WORK_MINUTES * selectedEmployee.calculation.presentDays
          } mins`,
        ]);
        summaryData.push([
          "Per Minute Rate",
          `₹${selectedEmployee.calculation.perMinuteRate.toFixed(2)}`,
        ]);
        summaryData.push([
          "Final Salary (Based on Minutes)",
          `₹${selectedEmployee.calculation.finalSalary.toLocaleString(
            "en-IN"
          )}`,
        ]);
      } else {
        // Regular employee salary calculation
        summaryData.push([
          "Per Day Salary",
          `₹${selectedEmployee.calculation.perDaySalary.toLocaleString(
            "en-IN"
          )}`,
        ]);
        summaryData.push([
          "Per Minute Rate",
          `₹${selectedEmployee.calculation.perMinuteRate.toFixed(2)}`,
        ]);

        summaryData.push([""]); // Empty row

        summaryData.push(["DEDUCTIONS"]);
        summaryData.push([
          "Absent Day Deduction",
          `₹${selectedEmployee.calculation.absentDeduction.toLocaleString(
            "en-IN"
          )}`,
        ]);

        if (isKishan) {
          summaryData.push([
            "Special Note",
            "No deduction for leaving after 6:00 PM",
          ]);
        }

        summaryData.push([
          "Total Deficit Minutes",
          `${selectedEmployee.calculation.totalDeficitMinutes} mins`,
        ]);
        summaryData.push([
          "Late Buffer Applied",
          `${selectedEmployee.calculation.lateBufferApplied} mins`,
        ]);
        summaryData.push([
          "Early Buffer Applied",
          `${selectedEmployee.calculation.earlyBufferApplied} mins`,
        ]);
        summaryData.push([
          "Total Buffer Applied",
          `${selectedEmployee.calculation.totalBufferApplied} mins`,
        ]);
        summaryData.push([
          "Final Deficit",
          `${selectedEmployee.calculation.finalDeficit} mins`,
        ]);
        summaryData.push([
          "Late/Early Deduction",
          `₹${selectedEmployee.calculation.deficitDeduction.toLocaleString(
            "en-IN"
          )}`,
        ]);

        // Add PIP deduction if applicable
        if (selectedEmployee.calculation.isPIP) {
          summaryData.push([
            "PIP Deduction (20%)",
            `₹${selectedEmployee.calculation.pipDeduction.toLocaleString(
              "en-IN"
            )}`,
          ]);
        }

        summaryData.push([
          "Total Deduction",
          `₹${selectedEmployee.calculation.deduction.toLocaleString("en-IN")}`,
        ]);

        summaryData.push([
          "Final Salary",
          `₹${selectedEmployee.calculation.finalSalary.toLocaleString(
            "en-IN"
          )}`,
        ]);
      }

      // Create summary worksheet
      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWS, "Summary");

      // Prepare attendance details data
      const attendanceData = [
        [
          "Day",
          "Status",
          "In Time",
          "Out Time",
          "Late (mins)",
          "Early (mins)",
          "Total Deficit",
          "Late Buffer",
          "Early Buffer",
        ],
      ];

      // Add attendance data
      Object.entries(selectedEmployee.attendance)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .forEach(([day, att]) => {
          const isLateBufferApplied =
            selectedEmployee.manualLateBufferDays.includes(day);
          const isEarlyBufferApplied =
            selectedEmployee.manualEarlyBufferDays.includes(day);
          const lateMinutes = att.isLate && att.lateBy > 0 ? att.lateBy : 0;

          // Handle Kishan's special case for early departures
          let earlyMinutes = 0;
          if (att.isEarly && att.earlyBy) {
            if (isKishan && att.outTime) {
              // Check if Kishan left after 6:00 PM (no deduction)
              const outTimeParts = att.outTime.split(":").map(Number);
              const outMinutes = outTimeParts[0] * 60 + outTimeParts[1];
              const sixPM = 18 * 60; // 6:00 PM in minutes

              if (outMinutes >= sixPM) {
                earlyMinutes = 0; // No deduction if after 6:00 PM
              } else {
                earlyMinutes = att.earlyBy;
              }
            } else {
              earlyMinutes = att.earlyBy;
            }
          }

          const totalDeficit = lateMinutes + earlyMinutes;

          attendanceData.push([
            att.date,
            att.status,
            att.inTime || "-",
            att.outTime || "-",
            lateMinutes,
            earlyMinutes,
            isSpecialDepartment ? "-" : totalDeficit, // No deficit for special departments
            isSpecialDepartment ? "N/A" : isLateBufferApplied ? "Yes" : "No",
            isSpecialDepartment ? "N/A" : isEarlyBufferApplied ? "Yes" : "No",
          ]);
        });

      // Create attendance worksheet
      const attendanceWS = XLSX.utils.aoa_to_sheet(attendanceData);
      XLSX.utils.book_append_sheet(wb, attendanceWS, "Attendance Details");

      // Export workbook
      const periodText = month && year ? `${month}_${year}_` : "";
      const fileName = `${selectedEmployee.name}_Salary_${periodText}${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error exporting to Excel");
    } finally {
      setExportLoading(false);
    }
  };

  // Complete Export all employees to Excel
  const exportAllToExcel = () => {
    if (employees.length === 0) return;

    setExportLoading(true);

    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Calculate grand total of all salaries
      const grandTotal = employees.reduce(
        (total, emp) => total + emp.calculation.finalSalary,
        0
      );

      // Create summary sheet for all employees
      const summaryData = [
        [
          "Employee ID",
          "Name",
          "Department",
          "Special Type",
          "Base Salary (₹)",
          "Calculation Method",
          "Absent Deduction (₹)",
          "Late/Early Deduction (₹)",
          "PIP Deduction (₹)",
          "Total Deduction (₹)",
          "Final Salary (₹)",
        ],
      ];

      // Add data for each employee
      employees.forEach((employee) => {
        const isSpecialDepartment = employee.calculation.isSpecialDepartment;
        const isKishan = employee.calculation.isKishan;

        // Determine special type
        let specialType = "-";
        if (isSpecialDepartment) specialType = "Special Department";
        else if (isKishan) specialType = "Special Employee (Kishan)";

        // Determine calculation method
        const calculationMethod = isSpecialDepartment
          ? "Minutes Worked"
          : "Standard";

        summaryData.push([
          employee.id,
          employee.name,
          employee.department,
          specialType,
          employee.salary.toLocaleString("en-IN"),
          calculationMethod,
          isSpecialDepartment
            ? "-"
            : employee.calculation.absentDeduction.toLocaleString("en-IN"),
          isSpecialDepartment
            ? "-"
            : employee.calculation.deficitDeduction.toLocaleString("en-IN"),
          isSpecialDepartment
            ? "-"
            : employee.calculation.pipDeduction.toLocaleString("en-IN"),
          isSpecialDepartment
            ? "-"
            : employee.calculation.deduction.toLocaleString("en-IN"),
          employee.calculation.finalSalary.toLocaleString("en-IN"),
        ]);
      });

      // Add grand total row
      summaryData.push([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "GRAND TOTAL",
        `₹${grandTotal.toLocaleString("en-IN")}`,
      ]);

      // Create summary worksheet
      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWS, "All Employees");

      // Create individual sheets for each employee
      employees.forEach((employee) => {
        const isSpecialDepartment = employee.calculation.isSpecialDepartment;
        const isKishan = employee.calculation.isKishan;

        const employeeData = [
          ["Employee ID", employee.id],
          ["Name", employee.name],
          ["Department", employee.department],
          ["Base Salary", `₹${employee.salary.toLocaleString("en-IN")}`],
        ];

        // Add special status indicators if applicable
        if (isSpecialDepartment) {
          employeeData.push([
            "Special Department",
            "Yes - Paid by minutes worked",
          ]);
        }
        if (isKishan) {
          employeeData.push([
            "Special Employee",
            "Yes - Kishan can leave after 6:00 PM",
          ]);
        }

        employeeData.push([""]); // Empty row

        employeeData.push(["ATTENDANCE SUMMARY"]);
        employeeData.push(["Total Days", employee.calculation.totalDays]);
        employeeData.push(["Working Days", employee.calculation.workingDays]);
        employeeData.push(["Present Days", employee.calculation.presentDays]);
        employeeData.push(["WFH Days", employee.calculation.wfhDays]);
        employeeData.push(["CL Days", employee.calculation.clDays]);
        employeeData.push(["Holiday Days", employee.calculation.holidayDays]);
        employeeData.push(["Week Off Days", employee.calculation.weekOffDays]);
        employeeData.push(["Absent Days", employee.calculation.absentDays]);

        employeeData.push([""]); // Empty row

        // Add salary calculation section based on employee type
        employeeData.push(["SALARY CALCULATION"]);

        if (isSpecialDepartment) {
          // Special department salary calculation
          employeeData.push([
            "Total Minutes Worked",
            `${employee.calculation.totalWorkedMinutes} mins`,
          ]);
          employeeData.push([
            "Extra Minutes Beyond Standard",
            `${employee.calculation.totalExtraMinutes} mins`,
          ]);
          employeeData.push([
            "Standard Work Minutes (if full days)",
            `${EXPECTED_WORK_MINUTES * employee.calculation.presentDays} mins`,
          ]);
          employeeData.push([
            "Per Minute Rate",
            `₹${employee.calculation.perMinuteRate.toFixed(2)}`,
          ]);
          employeeData.push([
            "Final Salary (Based on Minutes)",
            `₹${employee.calculation.finalSalary.toLocaleString("en-IN")}`,
          ]);
        } else {
          // Regular employee salary calculation
          employeeData.push([
            "Per Day Salary",
            `₹${employee.calculation.perDaySalary.toLocaleString("en-IN")}`,
          ]);
          employeeData.push([
            "Per Minute Rate",
            `₹${employee.calculation.perMinuteRate.toFixed(2)}`,
          ]);

          employeeData.push([""]); // Empty row

          employeeData.push(["DEDUCTIONS"]);
          employeeData.push([
            "Absent Day Deduction",
            `₹${employee.calculation.absentDeduction.toLocaleString("en-IN")}`,
          ]);

          if (isKishan) {
            employeeData.push([
              "Special Note",
              "No deduction for leaving after 6:00 PM",
            ]);
          }

          employeeData.push([
            "Total Deficit Minutes",
            `${employee.calculation.totalDeficitMinutes} mins`,
          ]);
          employeeData.push([
            "Late Buffer Applied",
            `${employee.calculation.lateBufferApplied} mins`,
          ]);
          employeeData.push([
            "Early Buffer Applied",
            `${employee.calculation.earlyBufferApplied} mins`,
          ]);
          employeeData.push([
            "Total Buffer Applied",
            `${employee.calculation.totalBufferApplied} mins`,
          ]);
          employeeData.push([
            "Final Deficit",
            `${employee.calculation.finalDeficit} mins`,
          ]);
          employeeData.push([
            "Late/Early Deduction",
            `₹${employee.calculation.deficitDeduction.toLocaleString("en-IN")}`,
          ]);

          // Add PIP deduction if applicable
          if (employee.calculation.isPIP) {
            employeeData.push([
              "PIP Deduction (20%)",
              `₹${employee.calculation.pipDeduction.toLocaleString("en-IN")}`,
            ]);
          }

          employeeData.push([
            "Total Deduction",
            `₹${employee.calculation.deduction.toLocaleString("en-IN")}`,
          ]);

          employeeData.push([
            "Final Salary",
            `₹${employee.calculation.finalSalary.toLocaleString("en-IN")}`,
          ]);
        }

        employeeData.push(["", ""]);

        employeeData.push(["ATTENDANCE DETAILS"]);

        employeeData.push([
          "Day",
          "Status",
          "In Time",
          "Out Time",
          "Late (mins)",
          "Early (mins)",
          "Total Deficit",
          "Late Buffer",
          "Early Buffer",
        ]);

        // Add attendance data with manual buffer selection
        Object.entries(employee.attendance)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .forEach(([day, att]) => {
            const isLateBufferApplied =
              employee.manualLateBufferDays.includes(day);
            const isEarlyBufferApplied =
              employee.manualEarlyBufferDays.includes(day);
            const lateMinutes = att.isLate && att.lateBy > 0 ? att.lateBy : 0;

            // Handle Kishan's special case for early departures
            let earlyMinutes = 0;
            if (att.isEarly && att.earlyBy) {
              if (isKishan && att.outTime) {
                // Check if Kishan left after 6:00 PM (no deduction)
                const outTimeParts = att.outTime.split(":").map(Number);
                const outMinutes = outTimeParts[0] * 60 + outTimeParts[1];
                const sixPM = 18 * 60; // 6:00 PM in minutes

                if (outMinutes >= sixPM) {
                  earlyMinutes = 0; // No deduction if after 6:00 PM
                } else {
                  earlyMinutes = att.earlyBy;
                }
              } else {
                earlyMinutes = att.earlyBy;
              }
            }

            const totalDeficit = lateMinutes + earlyMinutes;

            employeeData.push([
              att.date,
              att.status,
              att.inTime || "-",
              att.outTime || "-",
              lateMinutes,
              earlyMinutes,
              isSpecialDepartment ? "-" : totalDeficit, // No deficit for special departments
              isSpecialDepartment ? "N/A" : isLateBufferApplied ? "Yes" : "No",
              isSpecialDepartment ? "N/A" : isEarlyBufferApplied ? "Yes" : "No",
            ]);
          });

        // Create employee worksheet (truncate name if too long for sheet name)
        const sheetName =
          employee.name.length > 25
            ? `${employee.name.substring(0, 22)}...`
            : employee.name;

        const employeeWS = XLSX.utils.aoa_to_sheet(employeeData);
        XLSX.utils.book_append_sheet(wb, employeeWS, sheetName);
      });

      // Export workbook
      const periodText = month && year ? `${month}_${year}_` : "";
      const fileName = `All_Employees_Salary_${periodText}${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Error exporting all employees to Excel:", error);
      alert("Error exporting to Excel");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}

      <main className="container mx-auto p-4">
        {/* File upload section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center mb-2">
            <Briefcase className="mr-3 text-purple-600" />
            Automated Salary Calculator
          </h1>
          <p className="text-gray-600">
            Calculate precise salaries instantly with smart, data-driven
            estimates
          </p>
        </div>
        <div className="mb-8 bg-white p-6 rounded-lg shadow-md border border-gray-200 mt-6">
          <div className="flex w-full justify-between">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FileInput className="mr-2 text-purple-600" />
              Import Attendance Data
            </h2>
          </div>

          <div className="flex items-center flex-wrap gap-4">
            <label className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer shadow-sm transition-all">
              <span>Choose Excel File</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <span className="text-gray-600">
              {loading
                ? "Processing..."
                : employees.length > 0
                ? `Imported ${employees.length} employees | ${maxDaysInMonth} days detected`
                : "No file selected"}
            </span>

            {employees.length > 0 && (
              <div className="ml-auto flex flex-wrap gap-2">
                {selectedEmployee && (
                  <>
                    <button
                      onClick={exportToExcel}
                      disabled={exportLoading}
                      className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 shadow-sm transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="mr-1 w-4 h-4" />
                      Export Current
                    </button>
                  </>
                )}
                <button
                  onClick={exportAllToExcel}
                  disabled={exportLoading}
                  className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 shadow-sm transition-all cursor-pointer"
                >
                  <FilePlus className="mr-1 w-4 h-4" />
                  Export All Excel
                </button>
                {/* Removed PDF export buttons */}

                {/* Add total salary display */}
                {employees.length > 0 && (
                  <div className="ml-2 px-3 py-2 bg-gray-100 rounded-lg flex items-center">
                    <span className="font-medium text-gray-700">
                      Total Payroll:{" "}
                    </span>
                    <span className="ml-1 font-bold text-green-700">
                      ₹
                      {employees
                        .reduce(
                          (total, emp) => total + emp.calculation.finalSalary,
                          0
                        )
                        .toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Instructions panel */}
        {!employees.length && (
          <div className="mb-8 bg-purple-50 border border-purple-200 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-2 flex items-center text-purple-800">
              <Info className="mr-2 w-5 h-5" />
              How to Use This Tool
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Upload an Excel file containing employee attendance data</li>
              <li>
                The tool will automatically detect working days in the month
              </li>
              <li>
                Manually select which days to apply buffer for late arrivals and
                early departures (max 3 of each type per employee)
              </li>
              <li>
                WFH (Work From Home) and CL (Casual Leave) days are fully paid
                with no deductions
              </li>
              <li>Export calculated salary details as Excel</li>
              <li>Batch export all employees' data with a single click</li>
            </ul>
          </div>
        )}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Employee list sidebar */}

          {employees.length > 0 && (
            <div className="md:w-1/3 lg:w-1/4 bg-white rounded-lg shadow-md p-4 h-fit">
              <h2 className="text-lg font-semibold mb-2 flex items-center text-gray-900">
                <User className="mr-2 text-purple-600" />
                Employees
              </h2>

              {/* Employee filter */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Filter employees..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                />
              </div>

              <div className="max-h-96 overflow-y-auto">
                {employees
                  .filter(
                    (employee) =>
                      employee.name
                        .toLowerCase()
                        .includes(employeeFilter.toLowerCase()) ||
                      employee.department
                        .toLowerCase()
                        .includes(employeeFilter.toLowerCase())
                  )
                  .map((employee) => (
                    <div
                      key={employee.id}
                      className={`employee-item p-3 mb-2 rounded-md cursor-pointer transition-all ${
                        selectedEmployee?.id === employee.id
                          ? "bg-purple-100 border-l-4 border-purple-500 text-gray-900"
                          : "hover:bg-gray-100 text-gray-900"
                      }`}
                      data-name={employee.name.toLowerCase()}
                      data-dept={employee.department.toLowerCase()}
                      onClick={() => setSelectedEmployee(employee)}
                    >
                      <div className="font-medium text-gray-900 capitalize">
                        {employee.name.toLowerCase()}
                      </div>
                      <div className="text-sm text-gray-700 flex items-center capitalize">
                        <Briefcase className="w-4 h-4 mr-1" />
                        {employee.department.toLowerCase()}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Employee details */}
          {selectedEmployee && (
            // Updated employee details section with PIP indicator
            <div className="md:w-2/3 lg:w-3/4 bg-white rounded-lg shadow-md p-4">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2 flex items-center">
                  {selectedEmployee.name}
                  {selectedEmployee.calculation.isPIP && (
                    <span className="ml-3 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                      Performance Improvement Plan
                    </span>
                  )}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-700">Department</div>
                    <div className="font-medium text-gray-900">
                      {selectedEmployee.department}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-700">Base Salary</div>
                    <div className="font-medium text-gray-900">
                      ₹{selectedEmployee.salary.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-700">Final Salary</div>
                    <div className="font-medium text-green-700">
                      ₹
                      {selectedEmployee.calculation.finalSalary.toLocaleString(
                        "en-IN"
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Special Department or Employee Indicator */}
              {(selectedEmployee.calculation.isSpecialDepartment ||
                selectedEmployee.calculation.isKishan) && (
                <div className="mb-4 bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                  {selectedEmployee.calculation.isSpecialDepartment && (
                    <p className="text-sm text-indigo-800 font-medium">
                      <span className="inline-block bg-indigo-100 px-2 py-1 rounded mr-2">
                        Special Department
                      </span>
                      This employee is paid based on actual minutes worked,
                      including time before 10:00 AM and after 6:30 PM.
                    </p>
                  )}
                  {selectedEmployee.calculation.isKishan && (
                    <p className="text-sm text-indigo-800 font-medium">
                      <span className="inline-block bg-indigo-100 px-2 py-1 rounded mr-2">
                        Special Employee
                      </span>
                      Kishan can leave early after 6:00 PM without salary
                      deduction.
                    </p>
                  )}
                </div>
              )}

              {/* Conditional Salary Calculation Panel based on department type */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Calculator className="mr-2 text-purple-600 w-5 h-5" />
                  Salary Calculation
                </h3>

                <div className="bg-blue-50 p-4 rounded-lg">
                  {selectedEmployee.calculation.isSpecialDepartment ? (
                    /* Special Department Salary Calculation */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-700">
                          Total Minutes Worked
                        </div>
                        <div className="font-medium text-gray-900">
                          {selectedEmployee.calculation.totalWorkedMinutes} mins
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-700">
                          Per Minute Rate
                        </div>
                        <div className="font-medium text-gray-900">
                          ₹
                          {selectedEmployee.calculation.perMinuteRate.toFixed(
                            2
                          )}
                          /min
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-700">
                          Base Salary (Full Month)
                        </div>
                        <div className="font-medium text-gray-700">
                          ₹{selectedEmployee.salary.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-700">
                          Extra Minutes Beyond Standard
                        </div>
                        <div className="font-medium text-green-700">
                          {selectedEmployee.calculation.totalExtraMinutes} mins
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-700">
                          Expected Work Minutes (Standard)
                        </div>
                        <div className="font-medium text-gray-700">
                          {EXPECTED_WORK_MINUTES *
                            selectedEmployee.calculation.presentDays}{" "}
                          mins
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-700">
                          Final Salary (Based on Minutes)
                        </div>
                        <div className="font-medium text-green-700">
                          ₹
                          {selectedEmployee.calculation.finalSalary.toLocaleString(
                            "en-IN"
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Regular Employee Salary Calculation */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-700">Base Salary</div>
                        <div className="font-medium text-gray-900">
                          ₹{selectedEmployee.salary.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-700">
                          Per Day Rate
                        </div>
                        <div className="font-medium text-gray-900">
                          ₹
                          {selectedEmployee.calculation.perDaySalary.toLocaleString(
                            "en-IN"
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-700">
                          Per Minute Rate
                        </div>
                        <div className="font-medium text-gray-900">
                          ₹
                          {selectedEmployee.calculation.perMinuteRate.toFixed(
                            2
                          )}
                          /min
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-700">Absent Days</div>
                        <div className="font-medium text-gray-900">
                          {selectedEmployee.calculation.absentDays} days
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-700">
                          Absent Deduction
                        </div>
                        <div className="font-medium text-red-700">
                          ₹
                          {selectedEmployee.calculation.absentDeduction.toLocaleString(
                            "en-IN"
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-700">
                          Late Minutes
                        </div>
                        <div className="font-medium text-gray-900">
                          {selectedEmployee.calculation.totalDeficitMinutes}{" "}
                          mins
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-700">
                          Buffer Applied
                        </div>
                        <div className="font-medium text-gray-900">
                          {selectedEmployee.calculation.totalBufferApplied} mins
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-700">
                          Final Deficit
                        </div>
                        <div className="font-medium text-gray-900">
                          {selectedEmployee.calculation.finalDeficit} mins
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-700">
                          Late/Early Deduction
                        </div>
                        <div className="font-medium text-red-700">
                          ₹
                          {selectedEmployee.calculation.deficitDeduction.toLocaleString(
                            "en-IN"
                          )}
                        </div>
                      </div>

                      {selectedEmployee.calculation.isPIP && (
                        <div>
                          <div className="text-sm text-gray-700">
                            PIP Deduction (20%)
                          </div>
                          <div className="font-medium text-red-700">
                            ₹
                            {selectedEmployee.calculation.pipDeduction.toLocaleString(
                              "en-IN"
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="text-sm text-gray-700">
                          Total Deduction
                        </div>
                        <div className="font-medium text-red-700">
                          ₹
                          {selectedEmployee.calculation.deduction.toLocaleString(
                            "en-IN"
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-700">
                          Final Salary
                        </div>
                        <div className="font-medium text-green-700">
                          ₹
                          {selectedEmployee.calculation.finalSalary.toLocaleString(
                            "en-IN"
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div ref={tableRef}>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Calendar className="mr-2 text-purple-600 w-5 h-5" />
                  Attendance Details
                </h3>

                <div className="bg-yellow-50 p-3 mb-4 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <strong>Manual Buffer Selection:</strong> You can apply
                    buffer (up to 15 mins per day) to a maximum of{" "}
                    {MAX_BUFFER_DAYS} days for each type (late and early). Check
                    the boxes to apply buffer to late arrivals and early
                    departures.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-2 px-3 text-left text-sm font-medium text-gray-700">
                          Day
                        </th>
                        <th className="py-2 px-3 text-left text-sm font-medium text-gray-700">
                          Status
                        </th>
                        <th className="py-2 px-3 text-left text-sm font-medium text-gray-700">
                          In Time
                        </th>
                        <th className="py-2 px-3 text-left text-sm font-medium text-gray-700">
                          Out Time
                        </th>
                        <th className="py-2 px-3 text-left text-sm font-medium text-gray-700">
                          Late By
                        </th>
                        <th className="py-2 px-3 text-left text-sm font-medium text-gray-700">
                          Early By
                        </th>
                        <th className="py-2 px-3 text-left text-sm font-medium text-gray-700">
                          Late Buffer
                        </th>
                        <th className="py-2 px-3 text-left text-sm font-medium text-gray-700">
                          Early Buffer
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {Object.entries(selectedEmployee.attendance)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([day, att]) => {
                          const isLateBufferApplied =
                            selectedEmployee.manualLateBufferDays.includes(day);
                          const isEarlyBufferApplied =
                            selectedEmployee.manualEarlyBufferDays.includes(
                              day
                            );
                          const canApplyLateBuffer =
                            att.status === "Present" &&
                            att.isLate &&
                            att.lateBy &&
                            att.lateBy > 0;
                          const canApplyEarlyBuffer =
                            att.status === "Present" &&
                            att.isEarly &&
                            att.earlyBy &&
                            att.earlyBy > 0;

                          // Colors for row background
                          let rowBgClass = "";
                          if (att.status === "Absent") {
                            rowBgClass = "bg-red-50";
                          } else if (att.status === "Week Off") {
                            rowBgClass = "bg-gray-50";
                          } else if (att.status === "WFH") {
                            rowBgClass = "bg-blue-50";
                          } else if (att.status === "CL") {
                            rowBgClass = "bg-yellow-50";
                          } else if (
                            isLateBufferApplied &&
                            isEarlyBufferApplied
                          ) {
                            rowBgClass = "bg-green-100"; // Both buffers applied
                          } else if (
                            isLateBufferApplied ||
                            isEarlyBufferApplied
                          ) {
                            rowBgClass = "bg-green-50"; // One buffer applied
                          }

                          return (
                            <tr
                              key={day}
                              className={`text-gray-900 ${rowBgClass}`}
                            >
                              <td className="py-2 px-3 text-sm">{att.date}</td>
                              <td className="py-2 px-3 text-sm">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    att.status === "Present"
                                      ? "bg-green-100 text-green-800"
                                      : att.status === "Absent"
                                      ? "bg-red-100 text-red-800"
                                      : att.status === "WFH"
                                      ? "bg-blue-100 text-purple-800"
                                      : att.status === "CL"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {att.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-sm text-gray-900">
                                {att.inTime || "-"}
                                {att.isLate && att.lateBy && (
                                  <span className="ml-2 text-xs text-red-600">
                                    (+{att.lateBy} mins late)
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-sm text-gray-900">
                                {att.outTime || "-"}
                                {att.isEarly && att.earlyBy && (
                                  <span className="ml-2 text-xs text-red-600">
                                    (-{att.earlyBy} mins early)
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-sm text-gray-900">
                                {att.isLate && att.lateBy > 0
                                  ? `${att.lateBy} mins`
                                  : "-"}
                              </td>
                              <td className="py-2 px-3 text-sm text-gray-900">
                                {att.isEarly && att.earlyBy > 0
                                  ? `${att.earlyBy} mins`
                                  : "-"}
                              </td>
                              <td className="py-2 px-3 text-sm">
                                {canApplyLateBuffer ? (
                                  <div
                                    onClick={() => toggleLateBufferForDay(day)}
                                    className={`inline-flex items-center justify-center w-6 h-6 rounded cursor-pointer 
                                    ${
                                      isLateBufferApplied
                                        ? "bg-green-500 text-white"
                                        : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                                    }`}
                                  >
                                    {isLateBufferApplied ? (
                                      <Check className="w-4 h-4" />
                                    ) : (
                                      <span className="text-xs">+</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-sm">
                                {canApplyEarlyBuffer ? (
                                  <div
                                    onClick={() => toggleEarlyBufferForDay(day)}
                                    className={`inline-flex items-center justify-center w-6 h-6 rounded cursor-pointer 
                                    ${
                                      isEarlyBufferApplied
                                        ? "bg-green-500 text-white"
                                        : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                                    }`}
                                  >
                                    {isEarlyBufferApplied ? (
                                      <Check className="w-4 h-4" />
                                    ) : (
                                      <span className="text-xs">+</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Calculator icon component
const Calculator = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" x2="16" y1="6" y2="6" />
      <line x1="8" x2="8" y1="14" y2="14" />
      <line x1="12" x2="12" y1="14" y2="14" />
      <line x1="16" x2="16" y1="14" y2="14" />
      <line x1="8" x2="8" y1="18" y2="18" />
      <line x1="12" x2="12" y1="18" y2="18" />
      <line x1="16" x2="16" y1="18" y2="18" />
    </svg>
  );
};