// pages/index.tsx
"use client";
import { useEffect, useState, useRef } from "react";
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
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Types
interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
  attendance: Record<string, DayAttendance>;
  calculation: SalaryCalculation;
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

interface SalaryCalculation {
  totalDays: number;
  workingDays: number;
  presentDays: number;
  wfhDays: number;
  weekOffDays: number;
  absentDays: number;
  clDays: number; // Added CL (Casual Leave) days
  holidayDays: number; // Add this line
  totalDeficitMinutes: number;
  bufferApplied: number;
  daysWithBuffer: string[];
  finalDeficit: number;
  deduction: number;
  finalSalary: number;
  perMinuteRate: number;
}

// Constants
const EXPECTED_WORK_MINUTES = 510; // 8.5 hours = 510 minutes
const BUFFER_MINUTES = 15; // 15 minutes buffer per day
const MAX_BUFFER_DAYS = 3; // 3 days per month
const DEFAULT_SALARY = 0; // Default salary if not provided

// Office hours constants for logical time correction
const OFFICE_START_HOUR = 10; // Office starts at 10:00 AM
const OFFICE_END_HOUR = 18; // Office ends at 18:30 (6:30 PM)
const OFFICE_END_MINUTE = 30;

declare global {
  interface Window {
    jsPDF: any;
  }
}

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
  const [manualBufferDays, setManualBufferDays] = useState<
    Record<number, string[]>
  >({});
  const tableRef = useRef<HTMLDivElement>(null);

  // Process file upload
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

      // Initialize manual buffer days for new employees
      const initialManualBufferDays: Record<number, string[]> = {};
      extractedEmployees.forEach((employee) => {
        // If we don't have selections for this employee yet, initialize with empty array
        if (!manualBufferDays[employee.id]) {
          initialManualBufferDays[employee.id] = [];
        }
      });

      // Only set if we have new employees
      if (Object.keys(initialManualBufferDays).length > 0) {
        setManualBufferDays((prev) => ({
          ...prev,
          ...initialManualBufferDays,
        }));
      }

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

  // Helper functions for manual buffer selection
  const getSelectedBufferDaysCount = (employeeId: number) => {
    return manualBufferDays[employeeId]?.length || 0;
  };

  const toggleBufferDay = (employeeId: number, day: string) => {
    const currentBufferDays = manualBufferDays[employeeId] || [];

    // If already selected, remove it
    if (currentBufferDays.includes(day)) {
      setManualBufferDays({
        ...manualBufferDays,
        [employeeId]: currentBufferDays.filter((d) => d !== day),
      });
    }
    // Otherwise add it if we haven't reached the maximum
    else if (currentBufferDays.length < MAX_BUFFER_DAYS) {
      setManualBufferDays({
        ...manualBufferDays,
        [employeeId]: [...currentBufferDays, day],
      });
    }
  };

  // Update employee calculations when buffer selections change
  useEffect(() => {
    if (employees.length > 0) {
      // Recalculate salaries with manually selected buffer days
      const updatedEmployees = employees.map((employee) => {
        const calculation = calculateSalary(employee);
        return { ...employee, calculation };
      });

      setEmployees(updatedEmployees);

      // Update selected employee if needed
      if (selectedEmployee) {
        const updatedSelectedEmployee = updatedEmployees.find(
          (emp) => emp.id === selectedEmployee.id
        );
        if (updatedSelectedEmployee) {
          setSelectedEmployee(updatedSelectedEmployee);
        }
      }
    }
  }, [manualBufferDays]);

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

  // Process employee data from Excel
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
          calculation: {
            totalDays: 0,
            workingDays: 0,
            presentDays: 0,
            wfhDays: 0,
            weekOffDays: 0,
            absentDays: 0,
            clDays: 0,
            totalDeficitMinutes: 0,
            bufferApplied: 0,
            daysWithBuffer: [],
            finalDeficit: 0,
            deduction: 0,
            finalSalary: 0,
            perMinuteRate: 0,
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
              currentEmployee.attendance[dayKey]
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
                const lateBy = isLate ? inMinutes - expectedInMinutes : 0;

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

  // Complete fixed calculateSalary function with manual buffer selection
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

    const totalDays = Object.keys(employee.attendance).length;
    const workingDays = totalDays - weekOffDays;

    // Get total deficit minutes from ALL days (including Absent days)
    const totalDeficitMinutes = Object.values(employee.attendance).reduce(
      (total, att) => total + att.deficitMinutes,
      0
    );

    // MANUAL BUFFER APPLICATION LOGIC
    const bufferDaysForEmployee = manualBufferDays[employee.id] || [];
    let bufferApplied = 0;

    // Calculate buffer from the manually selected days
    bufferDaysForEmployee.forEach((day) => {
      if (employee.attendance[day]) {
        const att = employee.attendance[day];
        // Apply buffer to any day with deficit minutes (both late arrivals and early departures)
        if (att.status === "Present" && att.deficitMinutes > 0) {
          // Apply up to BUFFER_MINUTES of buffer (15 mins) per day
          bufferApplied += Math.min(att.deficitMinutes, BUFFER_MINUTES);
        }
      }
    });

    // Calculate final deficit after buffer
    const finalDeficit = Math.max(0, totalDeficitMinutes - bufferApplied);

    // Calculate daily salary rate
    const dailySalary = employee.salary / totalDays;

    // IMPROVED RATE CALCULATION - TRUNCATE to 2 decimal places
    const perMinuteRate =
      Math.floor((dailySalary / EXPECTED_WORK_MINUTES) * 100) / 100;

    // Calculate deduction
    const deduction = Math.round(finalDeficit * perMinuteRate);

    // Calculate final salary
    const finalSalary = employee.salary - deduction;

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
      bufferApplied,
      daysWithBuffer: bufferDaysForEmployee,
      finalDeficit,
      deduction,
      finalSalary,
      perMinuteRate,
    };
  };

  // Export to Excel (for single employee)
  const exportToExcel = () => {
    if (!selectedEmployee) return;

    setExportLoading(true);

    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Prepare employee summary data
      const summaryData = [
        ["Employee Name", selectedEmployee.name],
        ["Department", selectedEmployee.department],
        ["Base Salary", selectedEmployee.salary],
        [""],
        ["ATTENDANCE SUMMARY"],
        ["Total Days", selectedEmployee.calculation.totalDays],
        ["Working Days", selectedEmployee.calculation.workingDays],
        ["Present Days", selectedEmployee.calculation.presentDays],
        ["WFH Days", selectedEmployee.calculation.wfhDays],
        ["Week Off Days", selectedEmployee.calculation.weekOffDays],
        ["Absent Days", selectedEmployee.calculation.absentDays],
        ["CL Days", selectedEmployee.calculation.clDays],
        [""],
        ["SALARY CALCULATION"],
        [
          "Total Deficit Minutes",
          selectedEmployee.calculation.totalDeficitMinutes,
        ],
        ["Buffer Applied", selectedEmployee.calculation.bufferApplied],
        ["Final Deficit", selectedEmployee.calculation.finalDeficit],
        ["Deduction Amount", selectedEmployee.calculation.deduction],
        ["Final Salary", selectedEmployee.calculation.finalSalary],
      ];

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
          "Deficit (mins)",
          "Buffer Applied",
        ],
      ];

      // Add attendance data
      Object.entries(selectedEmployee.attendance)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .forEach(([day, att]) => {
          const isBufferApplied =
            selectedEmployee.calculation.daysWithBuffer.includes(day);
          attendanceData.push([
            att.date,
            att.status,
            att.inTime || "-",
            att.outTime || "-",
            att.deficitMinutes > 0 ? att.deficitMinutes : 0,
            isBufferApplied ? "Yes" : "No",
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

  // Export all employees to Excel
  const exportAllToExcel = () => {
    if (employees.length === 0) return;

    setExportLoading(true);

    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Create summary sheet for all employees
      const summaryData = [
        [
          "Employee ID",
          "Name",
          "Department",
          "Base Salary",
          "Present Days",
          "WFH Days",
          "CL Days",
          "Week Off Days",
          "Absent Days",
          "Deficit Minutes",
          "Buffer Applied",
          "Final Deficit",
          "Deduction",
          "Final Salary",
        ],
      ];

      // Add data for each employee
      employees.forEach((employee) => {
        summaryData.push([
          employee.id,
          employee.name,
          employee.department,
          employee.salary,
          employee.calculation.presentDays,
          employee.calculation.wfhDays,
          employee.calculation.clDays,
          employee.calculation.weekOffDays,
          employee.calculation.absentDays,
          employee.calculation.totalDeficitMinutes,
          employee.calculation.bufferApplied,
          employee.calculation.finalDeficit,
          employee.calculation.deduction,
          employee.calculation.finalSalary,
        ]);
      });

      // Create summary worksheet
      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWS, "All Employees");

      // Create individual sheets for each employee
      employees.forEach((employee) => {
        const employeeData = [
          ["Employee ID", employee.id],
          ["Name", employee.name],
          ["Department", employee.department],
          ["Base Salary", employee.salary],
          [""],
          ["ATTENDANCE SUMMARY"],
          ["Total Days", employee.calculation.totalDays],
          ["Working Days", employee.calculation.workingDays],
          ["Present Days", employee.calculation.presentDays],
          ["WFH Days", employee.calculation.wfhDays],
          ["CL Days", employee.calculation.clDays],
          ["Week Off Days", employee.calculation.weekOffDays],
          ["Absent Days", employee.calculation.absentDays],
          [""],
          ["SALARY CALCULATION"],
          ["Total Deficit Minutes", employee.calculation.totalDeficitMinutes],
          ["Buffer Applied", employee.calculation.bufferApplied],
          ["Final Deficit", employee.calculation.finalDeficit],
          ["Deduction Amount", employee.calculation.deduction],
          ["Final Salary", employee.calculation.finalSalary],
          [""],
          ["ATTENDANCE DETAILS"],
          [
            "Day",
            "Status",
            "In Time",
            "Out Time",
            "Deficit (mins)",
            "Buffer Applied",
          ],
        ];

        // Add attendance data
        Object.entries(employee.attendance)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .forEach(([day, att]) => {
            const isBufferApplied =
              employee.calculation.daysWithBuffer.includes(day);
            employeeData.push([
              att.date,
              att.status,
              att.inTime || "-",
              att.outTime || "-",
              att.deficitMinutes > 0 ? att.deficitMinutes : 0,
              isBufferApplied ? "Yes" : "No",
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

  // Export to PDF (fixed for proper formatting)
  const exportToPDF = () => {
    if (!selectedEmployee) return;

    setExportLoading(true);

    try {
      // Create a new PDF document with proper dimensions
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      // Add company logo/header
      // Instead of an image, we'll create a styled header
      doc.setFillColor(41, 98, 255); // Blue header background
      doc.rect(0, 0, 210, 25, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("SALARY REPORT", 105, 15, { align: "center" });

      // Add subtitle with period
      if (month && year) {
        doc.setFontSize(12);
        doc.text(`${month} ${year}`, 105, 22, { align: "center" });
      }

      // Reset text color to black for the rest of the document
      doc.setTextColor(0, 0, 0);

      // Add employee info in a styled box
      doc.setFillColor(240, 240, 240);
      doc.rect(10, 30, 190, 25, "F");

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Employee Information", 15, 38);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${selectedEmployee.name}`, 15, 45);
      doc.text(`Department: ${selectedEmployee.department}`, 105, 45);
      doc.text(`Employee ID: ${selectedEmployee.id}`, 15, 52);
      doc.text(
        `Base Salary: ₹${selectedEmployee.salary.toLocaleString()}`,
        105,
        52
      );

      // Add summary section with colored boxes
      const startY = 65;

      // Present days (green box)
      doc.setFillColor(200, 250, 200);
      doc.rect(10, startY, 45, 25, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Present", 32.5, startY + 8, { align: "center" });
      doc.setFontSize(16);
      doc.text(
        selectedEmployee.calculation.presentDays.toString(),
        32.5,
        startY + 18,
        { align: "center" }
      );

      // WFH days (blue box)
      doc.setFillColor(200, 200, 250);
      doc.rect(58, startY, 45, 25, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("WFH", 80.5, startY + 8, { align: "center" });
      doc.setFontSize(16);
      doc.text(
        selectedEmployee.calculation.wfhDays.toString(),
        80.5,
        startY + 18,
        { align: "center" }
      );

      // Week Off days (gray box)
      doc.setFillColor(220, 220, 220);
      doc.rect(106, startY, 45, 25, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Week Off", 128.5, startY + 8, { align: "center" });
      doc.setFontSize(16);
      doc.text(
        selectedEmployee.calculation.weekOffDays.toString(),
        128.5,
        startY + 18,
        { align: "center" }
      );

      // Absent days (red box)
      doc.setFillColor(250, 200, 200);
      doc.rect(154, startY, 45, 25, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Absent", 176.5, startY + 8, { align: "center" });
      doc.setFontSize(16);
      doc.text(
        selectedEmployee.calculation.absentDays.toString(),
        176.5,
        startY + 18,
        { align: "center" }
      );

      // Add salary calculation section
      doc.setFillColor(230, 240, 255);
      doc.rect(10, startY + 35, 190, 60, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Salary Calculation", 15, startY + 45);

      // Calculation details
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const calcStartY = startY + 55;
      const lineHeight = 7;

      doc.text(
        `Total Deficit Minutes: ${selectedEmployee.calculation.totalDeficitMinutes}`,
        15,
        calcStartY
      );
      doc.text(
        `Buffer Applied: ${selectedEmployee.calculation.bufferApplied}`,
        15,
        calcStartY + lineHeight
      );
      doc.text(
        `Final Deficit: ${selectedEmployee.calculation.finalDeficit}`,
        15,
        calcStartY + lineHeight * 2
      );
      doc.text(
        `Per Minute Rate: ₹${selectedEmployee.calculation.perMinuteRate.toFixed(
          2
        )}`,
        15,
        calcStartY + lineHeight * 3
      );

      doc.text(
        `Deduction: ₹${selectedEmployee.calculation.deduction.toLocaleString()}`,
        120,
        calcStartY
      );

      // Highlight final salary
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(
        `Final Salary: ₹${selectedEmployee.calculation.finalSalary.toLocaleString()}`,
        120,
        calcStartY + lineHeight * 3
      );

      // Add attendance details table
      const tableStartY = startY + 105;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Attendance Details", 15, tableStartY);

      // Define table columns
      const col1X = 15; // Day
      const col2X = 35; // Status
      const col3X = 70; // In Time
      const col4X = 100; // Out Time
      const col5X = 130; // Deficit
      const col6X = 165; // Buffer

      // Create table header
      doc.setFillColor(41, 98, 255);
      doc.rect(10, tableStartY + 5, 190, 8, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text("Day", col1X, tableStartY + 10);
      doc.text("Status", col2X, tableStartY + 10);
      doc.text("In Time", col3X, tableStartY + 10);
      doc.text("Out Time", col4X, tableStartY + 10);
      doc.text("Deficit (mins)", col5X, tableStartY + 10);
      doc.text("Buffer", col6X, tableStartY + 10);

      // Reset text color to black for the table data
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");

      // Add attendance data (up to 20 rows per page)
      const rows = Object.entries(selectedEmployee.attendance).sort(
        ([a], [b]) => parseInt(a) - parseInt(b)
      );

      let currentPage = 1;
      const rowsPerPage = 20;
      const rowHeight = 7;

      for (let i = 0; i < rows.length; i++) {
        // Check if we need a new page
        if (i > 0 && i % rowsPerPage === 0) {
          doc.addPage();
          currentPage++;

          // Add header to new page
          doc.setFillColor(41, 98, 255);
          doc.rect(10, 15, 190, 8, "F");

          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text("Day", col1X, 20);
          doc.text("Status", col2X, 20);
          doc.text("In Time", col3X, 20);
          doc.text("Out Time", col4X, 20);
          doc.text("Deficit (mins)", col5X, 20);
          doc.text("Buffer", col6X, 20);

          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
        }

        const [day, att] = rows[i];
        const isBufferApplied =
          selectedEmployee.calculation.daysWithBuffer.includes(day);

        const yPos =
          currentPage === 1
            ? tableStartY + 15 + (i % rowsPerPage) * rowHeight
            : 25 + (i % rowsPerPage) * rowHeight;

        // Alternate row background
        if (i % 2 === 1) {
          doc.setFillColor(240, 240, 240);
          doc.rect(10, yPos - 5, 190, rowHeight, "F");
        }

        // Use different background color based on status
        if (att.status === "Absent") {
          doc.setFillColor(250, 220, 220);
          doc.rect(col2X - 5, yPos - 5, 30, rowHeight, "F");
        } else if (att.status === "WFH") {
          doc.setFillColor(220, 240, 250);
          doc.rect(col2X - 5, yPos - 5, 30, rowHeight, "F");
        } else if (att.status === "Week Off") {
          doc.setFillColor(230, 230, 230);
          doc.rect(col2X - 5, yPos - 5, 30, rowHeight, "F");
        } else if (att.status === "CL") {
          doc.setFillColor(250, 250, 200);
          doc.rect(col2X - 5, yPos - 5, 30, rowHeight, "F");
        }

        doc.text(att.date, col1X, yPos);
        doc.text(att.status, col2X, yPos);
        doc.text(att.inTime || "-", col3X, yPos);
        doc.text(att.outTime || "-", col4X, yPos);
        doc.text(
          att.deficitMinutes > 0 ? att.deficitMinutes.toString() : "-",
          col5X,
          yPos
        );
        doc.text(isBufferApplied ? "Yes" : "-", col6X, yPos);
      }

      // Add footer
      const pageCount = Math.ceil(rows.length / rowsPerPage);

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Add footer with date and page number
        doc.setFillColor(240, 240, 240);
        doc.rect(0, 282, 210, 15, "F");

        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const today = new Date();
        doc.text(
          `Generated on: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`,
          15,
          290
        );
        doc.text(`Page ${i} of ${pageCount}`, 195, 290, { align: "right" });
      }

      // Save the PDF
      const periodText = month && year ? `${month}_${year}_` : "";
      const fileName = `${selectedEmployee.name}_Salary_${periodText}${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      alert(
        "Error exporting to PDF. Please make sure jsPDF is properly loaded."
      );
    } finally {
      setExportLoading(false);
    }
  };

  // Export all employees to PDF
  const exportAllToPDF = () => {
    if (employees.length === 0) return;

    setExportLoading(true);

    try {
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      // Add company header
      doc.setFillColor(41, 98, 255);
      doc.rect(0, 0, 210, 25, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("SALARY SUMMARY REPORT", 105, 15, { align: "center" });

      // Add subtitle with period
      if (month && year) {
        doc.setFontSize(12);
        doc.text(`${month} ${year}`, 105, 22, { align: "center" });
      }

      // Reset text color to black for the rest of the document
      doc.setTextColor(0, 0, 0);

      // Add summary information
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Employees: ${employees.length}`, 15, 35);
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 150, 35, {
        align: "right",
      });

      // Create summary table for all employees
      const startY = 45;

      // Table headers
      const headers = [
        "ID",
        "Name",
        "Department",
        "Base Salary",
        "Final Salary",
        "Deduction",
      ];

      // Column positions
      const colWidths = [10, 50, 40, 30, 30, 25];
      let colPositions = [15];

      for (let i = 0; i < colWidths.length - 1; i++) {
        colPositions.push(colPositions[i] + colWidths[i]);
      }

      // Draw header
      doc.setFillColor(41, 98, 255);
      doc.rect(10, startY, 190, 8, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");

      headers.forEach((header, i) => {
        doc.text(header, colPositions[i], startY + 5.5);
      });

      // Reset text color to black for table data
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");

      // Add employee data
      let yPosition = startY + 15;
      const rowHeight = 8;
      let currentPage = 1;
      const maxRowsPerPage = 30;

      employees.forEach((employee, index) => {
        // Check if we need a new page
        if (index > 0 && index % maxRowsPerPage === 0) {
          doc.addPage();
          currentPage++;

          // Add header to new page
          doc.setFillColor(41, 98, 255);
          doc.rect(10, 15, 190, 8, "F");

          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");

          headers.forEach((header, i) => {
            doc.text(header, colPositions[i], 20.5);
          });

          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");

          yPosition = 30;
        }

        // Alternate row background
        if (index % 2 === 1) {
          doc.setFillColor(240, 240, 240);
          doc.rect(10, yPosition - 5, 190, rowHeight, "F");
        }

        // Employee data
        doc.text(employee.id.toString(), colPositions[0], yPosition);

        // Truncate name if too long
        const displayName =
          employee.name.length > 25
            ? employee.name.substring(0, 22) + "..."
            : employee.name;
        doc.text(displayName, colPositions[1], yPosition);

        // Truncate department if too long
        const displayDept =
          employee.department.length > 20
            ? employee.department.substring(0, 17) + "..."
            : employee.department;
        doc.text(displayDept, colPositions[2], yPosition);

        // Salary information
        doc.text(
          `₹${employee.salary.toLocaleString()}`,
          colPositions[3],
          yPosition
        );
        doc.text(
          `₹${employee.calculation.finalSalary.toLocaleString()}`,
          colPositions[4],
          yPosition
        );
        doc.text(
          `₹${employee.calculation.deduction.toLocaleString()}`,
          colPositions[5],
          yPosition
        );

        yPosition += rowHeight;
      });

      // Add individual employee pages
      employees.forEach((employee) => {
        doc.addPage();

        // Add employee header
        doc.setFillColor(41, 98, 255);
        doc.rect(0, 0, 210, 25, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(employee.name, 105, 12, { align: "center" });
        doc.setFontSize(12);
        doc.text(
          `Salary Report ${month ? `- ${month} ${year}` : ""}`,
          105,
          20,
          { align: "center" }
        );

        // Reset text color to black
        doc.setTextColor(0, 0, 0);

        // Employee info box
        doc.setFillColor(240, 240, 240);
        doc.rect(10, 30, 190, 20, "F");

        doc.setFontSize(10);
        doc.text(`ID: ${employee.id}`, 15, 38);
        doc.text(`Department: ${employee.department}`, 15, 45);
        doc.text(`Base Salary: ₹${employee.salary.toLocaleString()}`, 120, 38);
        doc.text(
          `Final Salary: ₹${employee.calculation.finalSalary.toLocaleString()}`,
          120,
          45
        );

        // Attendance summary in colored boxes
        const boxStartY = 55;
        const boxHeight = 25;
        const boxWidth = 45;
        const boxSpacing = 3;

        // Present
        doc.setFillColor(200, 250, 200);
        doc.rect(10, boxStartY, boxWidth, boxHeight, "F");
        doc.setFont("helvetica", "bold");
        doc.text("Present", 32.5, boxStartY + 8, { align: "center" });
        doc.setFontSize(16);
        doc.text(
          employee.calculation.presentDays.toString(),
          32.5,
          boxStartY + 18,
          { align: "center" }
        );

        // WFH
        doc.setFillColor(200, 220, 250);
        doc.rect(
          10 + boxWidth + boxSpacing,
          boxStartY,
          boxWidth,
          boxHeight,
          "F"
        );
        doc.setFontSize(10);
        doc.text("WFH", 32.5 + boxWidth + boxSpacing, boxStartY + 8, {
          align: "center",
        });
        doc.setFontSize(16);
        doc.text(
          employee.calculation.wfhDays.toString(),
          32.5 + boxWidth + boxSpacing,
          boxStartY + 18,
          { align: "center" }
        );

        // Week Off
        doc.setFillColor(220, 220, 220);
        doc.rect(
          10 + (boxWidth + boxSpacing) * 2,
          boxStartY,
          boxWidth,
          boxHeight,
          "F"
        );
        doc.setFontSize(10);
        doc.text(
          "Week Off",
          32.5 + (boxWidth + boxSpacing) * 2,
          boxStartY + 8,
          { align: "center" }
        );
        doc.setFontSize(16);
        doc.text(
          employee.calculation.weekOffDays.toString(),
          32.5 + (boxWidth + boxSpacing) * 2,
          boxStartY + 18,
          { align: "center" }
        );

        // Absent
        doc.setFillColor(250, 200, 200);
        doc.rect(
          10 + (boxWidth + boxSpacing) * 3,
          boxStartY,
          boxWidth,
          boxHeight,
          "F"
        );
        doc.setFontSize(10);
        doc.text("Absent", 32.5 + (boxWidth + boxSpacing) * 3, boxStartY + 8, {
          align: "center",
        });
        doc.setFontSize(16);
        doc.text(
          employee.calculation.absentDays.toString(),
          32.5 + (boxWidth + boxSpacing) * 3,
          boxStartY + 18,
          { align: "center" }
        );

        // Calculation info
        doc.setFillColor(230, 240, 255);
        doc.rect(10, boxStartY + boxHeight + 10, 190, 40, "F");

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Salary Calculation", 15, boxStartY + boxHeight + 20);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Total Deficit: ${employee.calculation.totalDeficitMinutes} mins`,
          15,
          boxStartY + boxHeight + 30
        );
        doc.text(
          `Buffer Applied: ${employee.calculation.bufferApplied} mins`,
          15,
          boxStartY + boxHeight + 38
        );
        doc.text(
          `Final Deficit: ${employee.calculation.finalDeficit} mins`,
          15,
          boxStartY + boxHeight + 46
        );

        doc.text(
          `Per Minute Rate: ₹${employee.calculation.perMinuteRate.toFixed(2)}`,
          120,
          boxStartY + boxHeight + 30
        );
        doc.text(
          `Deduction: ₹${employee.calculation.deduction.toLocaleString()}`,
          120,
          boxStartY + boxHeight + 38
        );
        doc.setFont("helvetica", "bold");
        doc.text(
          `Final Salary: ₹${employee.calculation.finalSalary.toLocaleString()}`,
          120,
          boxStartY + boxHeight + 46
        );

        // Simple attendance table (just showing counts)
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Attendance Summary", 15, boxStartY + boxHeight + 65);

        doc.setFillColor(240, 240, 240);
        doc.rect(10, boxStartY + boxHeight + 70, 190, 30, "F");

        doc.setFont("helvetica", "normal");
        doc.text(
          `Working Days: ${employee.calculation.workingDays}`,
          15,
          boxStartY + boxHeight + 80
        );
        doc.text(
          `Present: ${employee.calculation.presentDays}`,
          15,
          boxStartY + boxHeight + 90
        );
        doc.text(
          `Work From Home: ${employee.calculation.wfhDays}`,
          80,
          boxStartY + boxHeight + 80
        );
        doc.text(
          `Casual Leave: ${employee.calculation.clDays}`,
          80,
          boxStartY + boxHeight + 90
        );
        doc.text(
          `Week Off: ${employee.calculation.weekOffDays}`,
          145,
          boxStartY + boxHeight + 80
        );
        doc.text(
          `Absent: ${employee.calculation.absentDays}`,
          145,
          boxStartY + boxHeight + 90
        );

        // Footer
        doc.setFillColor(230, 230, 230);
        doc.rect(0, 275, 210, 22, "F");

        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(
          `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
          15,
          285
        );
        doc.text("Advanced Salary Calculator", 105, 285, { align: "center" });
        doc.text("CONFIDENTIAL", 195, 285, { align: "right" });
      });

      // Save the PDF
      const periodText = month && year ? `${month}_${year}_` : "";
      const fileName = `All_Employees_Salary_${periodText}${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error exporting all employees to PDF:", error);
      alert("Error exporting to PDF");
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
                    <button
                      onClick={exportToPDF}
                      disabled={exportLoading}
                      className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 shadow-sm transition-all cursor-pointer"
                    >
                      <File className="mr-1 w-4 h-4" />
                      Export PDF
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
                <button
                  onClick={exportAllToPDF}
                  disabled={exportLoading}
                  className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 shadow-sm transition-all cursor-pointer"
                >
                  <Users className="mr-1 w-4 h-4" />
                  Export All PDF
                </button>
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
                Manually select which late days to apply buffer to (max 3 per
                employee)
              </li>
              <li>
                WFH (Work From Home) and CL (Casual Leave) days are fully paid
                with no deductions
              </li>
              <li>Export calculated salary details as Excel or PDF</li>
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
            <div className="md:w-2/3 lg:w-3/4 bg-white rounded-lg shadow-md p-4">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">
                  {selectedEmployee.name}
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
                      ₹{selectedEmployee.salary.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-700">Final Salary</div>
                    <div className="font-medium text-green-700">
                      ₹
                      {selectedEmployee.calculation.finalSalary.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Calendar className="mr-2 text-purple-600 w-5 h-5" />
                  Attendance Summary
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-blue-50 p-3 rounded-md text-center">
                    <div className="text-sm text-gray-700">Total Days</div>
                    <div className="font-medium text-gray-900 text-lg">
                      {selectedEmployee.calculation.totalDays}
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-md text-center">
                    <div className="text-sm text-gray-700">Working Days</div>
                    <div className="font-medium text-gray-900 text-lg">
                      {selectedEmployee.calculation.workingDays}
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-md text-center">
                    <div className="text-sm text-gray-700">Present</div>
                    <div className="font-medium text-green-700 text-lg">
                      {selectedEmployee.calculation.presentDays}
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-md text-center">
                    <div className="text-sm text-gray-700">WFH</div>
                    <div className="font-medium text-purple-700 text-lg">
                      {selectedEmployee.calculation.wfhDays}
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-md text-center">
                    <div className="text-sm text-gray-700">CL</div>
                    <div className="font-medium text-yellow-600 text-lg">
                      {selectedEmployee.calculation.clDays}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md text-center">
                    <div className="text-sm text-gray-700">Week Off</div>
                    <div className="font-medium text-gray-600 text-lg">
                      {selectedEmployee.calculation.weekOffDays}
                    </div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-md text-center">
                    <div className="text-sm text-gray-700">Absent</div>
                    <div className="font-medium text-red-700 text-lg">
                      {selectedEmployee.calculation.absentDays}
                    </div>
                  </div>
                </div>
              </div>

              {/* Salary Calculation Summary */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Calculator className="mr-2 text-purple-600 w-5 h-5" />
                  Salary Calculation
                </h3>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-700">Base Salary</div>
                      <div className="font-medium text-gray-900">
                        ₹{selectedEmployee.salary.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-700">Total Deficit</div>
                      <div className="font-medium text-gray-900">
                        {selectedEmployee.calculation.totalDeficitMinutes}{" "}
                        minutes
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-700">
                        Buffer Applied
                      </div>
                      <div className="font-medium text-gray-900">
                        {selectedEmployee.calculation.bufferApplied} minutes
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-700">Final Deficit</div>
                      <div className="font-medium text-gray-900">
                        {selectedEmployee.calculation.finalDeficit} minutes
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-700">Deficit Rate</div>
                      <div className="font-medium text-gray-900">
                        ₹{selectedEmployee.calculation.perMinuteRate.toFixed(2)}{" "}
                        per min
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-700">
                        Deduction Amount
                      </div>
                      <div className="font-medium text-red-700">
                        ₹
                        {selectedEmployee.calculation.deduction.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-700">Final Salary</div>
                      <div className="font-medium text-green-700">
                        ₹
                        {selectedEmployee.calculation.finalSalary.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-700">
                        Buffer Days Used
                      </div>
                      <div className="font-medium text-gray-900">
                        {selectedEmployee.calculation.daysWithBuffer.length} of{" "}
                        {MAX_BUFFER_DAYS}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Details with manual buffer selection */}
              <div ref={tableRef}>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Calendar className="mr-2 text-purple-600 w-5 h-5" />
                  Attendance Details
                </h3>

                <div className="bg-yellow-50 p-3 mb-4 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <strong>Buffer Selection:</strong> Check the boxes below to
                    apply buffer for any day with deficit minutes (up to{" "}
                    {MAX_BUFFER_DAYS} days). You can apply buffer to days with
                    late arrivals, early departures, or both.
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
                          Deficit
                        </th>
                        <th className="py-2 px-3 text-left text-sm font-medium text-gray-700">
                          Apply Buffer
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {Object.entries(selectedEmployee.attendance)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([day, att]) => {
                          const isBufferApplied =
                            selectedEmployee.calculation.daysWithBuffer.includes(
                              day
                            );

                          // Get the count of currently selected buffer days
                          const selectedBufferCount =
                            getSelectedBufferDaysCount(selectedEmployee.id);

                          return (
                            <tr
                              key={day}
                              className={`text-gray-900 ${
                                att.status === "Absent"
                                  ? "bg-red-50"
                                  : att.status === "Week Off"
                                  ? "bg-gray-50"
                                  : att.status === "WFH"
                                  ? "bg-blue-50"
                                  : att.status === "CL"
                                  ? "bg-yellow-50"
                                  : isBufferApplied
                                  ? "bg-green-50"
                                  : ""
                              }`}
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
                                    (+{att.lateBy} min late)
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-sm text-gray-900">
                                {att.outTime || "-"}
                                {att.isEarly && att.earlyBy && (
                                  <span className="ml-2 text-xs text-red-600">
                                    (-{att.earlyBy} min early)
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-sm text-gray-900">
                                {att.deficitMinutes > 0
                                  ? `${att.deficitMinutes} mins`
                                  : "-"}
                              </td>
                              <td className="py-2 px-3 text-sm">
                                {att.status === "Present" &&
                                att.deficitMinutes > 0 ? (
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={isBufferApplied}
                                      disabled={
                                        !isBufferApplied &&
                                        selectedBufferCount >= MAX_BUFFER_DAYS
                                      }
                                      onChange={() =>
                                        toggleBufferDay(
                                          selectedEmployee.id,
                                          day
                                        )
                                      }
                                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 rounded"
                                    />
                                    <span className="ml-2 text-xs text-green-600">
                                      {isBufferApplied
                                        ? `Applied (${Math.min(
                                            att.deficitMinutes,
                                            BUFFER_MINUTES
                                          )} mins)`
                                        : selectedBufferCount >=
                                            MAX_BUFFER_DAYS && !isBufferApplied
                                        ? "Limit reached"
                                        : "Eligible"}
                                    </span>
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
