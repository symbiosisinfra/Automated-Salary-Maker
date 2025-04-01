// app/api/departments/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { ObjectId } from "mongodb";

// Department schema for validation
const departmentSchema = z.object({
  name: z.string().min(1, { message: "Department name is required" }),
  description: z.string().optional(),
  active: z.boolean().default(true),
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

// GET all departments
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const departments = await db
      .collection("departments")
      .find({})
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

// POST - Create a new department
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
    const validationResult = departmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    // Connect to database
    const { db } = await connectToDatabase();

    // Check if department already exists
    const existingDepartment = await db.collection("departments").findOne({
      name: { $regex: new RegExp(`^${body.name}$`, "i") },
    });

    if (existingDepartment) {
      return NextResponse.json(
        { error: "Department with this name already exists" },
        { status: 400 }
      );
    }

    const department = validationResult.data;

    // Add timestamps
    const now = new Date();
    const newDepartment = {
      ...department,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Insert into database
    const result = await db.collection("departments").insertOne(newDepartment);

    // Return the created department with its ID
    return NextResponse.json(
      {
        ...newDepartment,
        _id: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 }
    );
  }
}

// PATCH - Update a department
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
        { error: "Department ID is required" },
        { status: 400 }
      );
    }

    const { id, ...updateData } = body;

    // Validate update data
    const partialDepartmentSchema = departmentSchema.partial();
    const validationResult = partialDepartmentSchema.safeParse(updateData);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    // Connect to database
    const { db } = await connectToDatabase();

    // If name is being updated, check for duplicates
    if (updateData.name) {
      const existingDepartment = await db.collection("departments").findOne({
        name: { $regex: new RegExp(`^${updateData.name}$`, "i") },
        _id: { $ne: new ObjectId(id) },
      });

      if (existingDepartment) {
        return NextResponse.json(
          { error: "Department with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Add updated timestamp
    const dataToUpdate = {
      ...validationResult.data,
      updatedAt: new Date().toISOString(),
    };

    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid department ID format" },
        { status: 400 }
      );
    }

    // Update in database
    const result = await db
      .collection("departments")
      .updateOne({ _id: objectId }, { $set: dataToUpdate });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Department updated successfully",
    });
  } catch (error) {
    console.error("Error updating department:", error);
    return NextResponse.json(
      { error: "Failed to update department" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a department
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
        { error: "Department ID is required" },
        { status: 400 }
      );
    }

    // Connect to database
    const { db } = await connectToDatabase();

    // Check if department is used in any designation
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid department ID format" },
        { status: 400 }
      );
    }

    // Get department to check name
    const department = await db
      .collection("departments")
      .findOne({ _id: objectId });

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Check if department is used in designations
    const designationsUsingDepartment = await db
      .collection("designations")
      .countDocuments({ department: department.name });

    if (designationsUsingDepartment > 0) {
      return NextResponse.json(
        { error: "Cannot delete department that is in use by designations" },
        { status: 400 }
      );
    }

    // Check if department is used in employees
    const employeesUsingDepartment = await db
      .collection("employees")
      .countDocuments({ department: department.name });

    if (employeesUsingDepartment > 0) {
      return NextResponse.json(
        { error: "Cannot delete department that is in use by employees" },
        { status: 400 }
      );
    }

    // Delete from database
    const result = await db
      .collection("departments")
      .deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting department:", error);
    return NextResponse.json(
      { error: "Failed to delete department" },
      { status: 500 }
    );
  }
}
