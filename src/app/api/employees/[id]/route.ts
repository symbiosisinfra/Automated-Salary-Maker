// app/api/employees/[id]/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET a single employee by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const id = params.id;
    
    // Connect to database
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
    
    // Find the employee
    const employee = await db.collection("employees").findOne({ _id: objectId });
    
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }
    
    // Return the employee data
    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

// PATCH update an employee by ID
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json(
        { error: "Admin permissions required" },
        { status: 403 }
      );
    }

    const id = params.id;
    const body = await request.json();
    
    // Connect to database
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
    
    // Remove _id from update data to prevent immutable field error
    const { _id, ...updateData } = body;
    
    // Add updated timestamp
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    
    // Update the employee
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
    return NextResponse.json(
      { success: true, message: "Employee updated successfully" }
    );
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE an employee by ID
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json(
        { error: "Admin permissions required" },
        { status: 403 }
      );
    }

    const id = params.id;
    
    // Connect to database
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
    
    // Delete the employee
    const result = await db.collection("employees").deleteOne({ _id: objectId });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }
    
    // Return success response
    return NextResponse.json(
      { success: true, message: "Employee deleted successfully" }
    );
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}