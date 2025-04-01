// app/api/employees/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { ObjectId } from "mongodb";

// Employee schema for validation
const employeeSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  empId: z.string().min(1, { message: "Employee ID is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  mobile: z.string().optional(),
  designation: z.string().min(1, { message: "Designation is required" }),
  department: z.string().min(1, { message: "Department is required" }),
  joiningDate: z.string().optional(),
  salary: z
    .number()
    .nonnegative({ message: "Salary must be a positive number" }),
  address: z.string().optional(),
  city: z.string().optional(),
  status: z.enum(["Active", "On Leave", "Contract", "Terminated"]),
  emergencyContact: z.string().optional(),
  education: z.string().optional(),
  experience: z.number().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
});

// Helper function to check if user has admin permissions
async function checkAdminPermission() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      allowed: false,
      message: "Authentication required",
    };
  }

  if (session.user.role !== "admin" && session.user.role !== "superadmin") {
    return {
      allowed: false,
      message: "Admin permissions required",
    };
  }

  return { allowed: true };
}

// GET all employees
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const employees = await db.collection("employees").find({}).toArray();

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

// POST - Create a new employee
export async function POST(request: Request) {
  try {
    // Check permissions
    const permissionCheck = await checkAdminPermission();
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.message },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate input data
    const validationResult = employeeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const employee = validationResult.data;

    // Add timestamps
    const now = new Date();
    const newEmployee = {
      ...employee,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Connect to database and insert
    const { db } = await connectToDatabase();
    const result = await db.collection("employees").insertOne(newEmployee);

    // Return the created employee with its ID
    return NextResponse.json(
      {
        ...newEmployee,
        _id: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}

// PATCH - Update an employee
export async function PATCH(request: Request) {
  try {
    // Check permissions
    const permissionCheck = await checkAdminPermission();
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.message },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Ensure id is provided
    if (!body.id) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const { id, ...updateData } = body;

    // Validate update data
    const partialEmployeeSchema = employeeSchema.partial();
    const validationResult = partialEmployeeSchema.safeParse(updateData);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    // Add updated timestamp
    const dataToUpdate = {
      ...validationResult.data,
      updatedAt: new Date().toISOString(),
    };

    // Connect to database and update
    const { db } = await connectToDatabase();

    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid employee ID format" },
        { status: 400 }
      );
    }

    const result = await db
      .collection("employees")
      .updateOne({ _id: objectId }, { $set: dataToUpdate });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Employee updated successfully",
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an employee
export async function DELETE(request: Request) {
  try {
    // Check permissions
    const permissionCheck = await checkAdminPermission();
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.message },
        { status: 403 }
      );
    }

    // Get ID from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    // Connect to database and delete
    const { db } = await connectToDatabase();

    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid employee ID format" },
        { status: 400 }
      );
    }

    const result = await db
      .collection("employees")
      .deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
