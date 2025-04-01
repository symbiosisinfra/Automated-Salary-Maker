// app/api/designations/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { ObjectId } from "mongodb";

// Designation schema for validation
const designationSchema = z.object({
  name: z.string().min(1, { message: "Designation name is required" }),
  department: z.string().min(1, { message: "Department is required" }),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

// Helper function to check if user has admin permissions
async function checkAdminPermission() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return {
      allowed: false, 
      message: "Authentication required"
    };
  }
  
  if (session.user.role !== "admin" && session.user.role !== "superadmin") {
    return {
      allowed: false,
      message: "Admin permissions required"
    };
  }
  
  return { allowed: true };
}

// GET all designations
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department");
    
    const { db } = await connectToDatabase();
    
    // If department is specified, filter by department
    const filter = department ? { department } : {};
    const designations = await db.collection("designations")
      .find(filter)
      .sort({ name: 1 })
      .toArray();
    
    return NextResponse.json(designations);
  } catch (error) {
    console.error("Error fetching designations:", error);
    return NextResponse.json(
      { error: "Failed to fetch designations" },
      { status: 500 }
    );
  }
}

// POST - Create a new designation
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
    const validationResult = designationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Check if department exists
    const department = await db.collection("departments").findOne({ 
      name: body.department
    });
    
    if (!department) {
      return NextResponse.json(
        { error: "Department does not exist" },
        { status: 400 }
      );
    }
    
    // Check if designation already exists in this department
    const existingDesignation = await db.collection("designations").findOne({ 
      name: { $regex: new RegExp(`^${body.name}$`, 'i') },
      department: body.department
    });
    
    if (existingDesignation) {
      return NextResponse.json(
        { error: "Designation with this name already exists in this department" },
        { status: 400 }
      );
    }
    
    const designation = validationResult.data;
    
    // Add timestamps
    const now = new Date();
    const newDesignation = {
      ...designation,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    
    // Insert into database
    const result = await db.collection("designations").insertOne(newDesignation);
    
    // Return the created designation with its ID
    return NextResponse.json(
      { 
        ...newDesignation, 
        _id: result.insertedId 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating designation:", error);
    return NextResponse.json(
      { error: "Failed to create designation" },
      { status: 500 }
    );
  }
}

// PATCH - Update a designation
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
        { error: "Designation ID is required" },
        { status: 400 }
      );
    }
    
    const { id, ...updateData } = body;
    
    // Validate update data
    const partialDesignationSchema = designationSchema.partial();
    const validationResult = partialDesignationSchema.safeParse(updateData);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Get current designation
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid designation ID format" },
        { status: 400 }
      );
    }
    
    const currentDesignation = await db.collection("designations").findOne({ _id: objectId });
    
    if (!currentDesignation) {
      return NextResponse.json(
        { error: "Designation not found" },
        { status: 404 }
      );
    }
    
    // If department is being updated, check if it exists
    if (updateData.department) {
      const department = await db.collection("departments").findOne({ 
        name: updateData.department
      });
      
      if (!department) {
        return NextResponse.json(
          { error: "Department does not exist" },
          { status: 400 }
        );
      }
    }
    
    // If name or department is being updated, check for duplicates
    if (updateData.name || updateData.department) {
      const checkName = updateData.name || currentDesignation.name;
      const checkDepartment = updateData.department || currentDesignation.department;
      
      const existingDesignation = await db.collection("designations").findOne({ 
        name: { $regex: new RegExp(`^${checkName}$`, 'i') },
        department: checkDepartment,
        _id: { $ne: objectId }
      });
      
      if (existingDesignation) {
        return NextResponse.json(
          { error: "Designation with this name already exists in this department" },
          { status: 400 }
        );
      }
    }
    
    // Add updated timestamp
    const dataToUpdate = {
      ...validationResult.data,
      updatedAt: new Date().toISOString(),
    };
    
    // Update in database
    const result = await db.collection("designations").updateOne(
      { _id: objectId },
      { $set: dataToUpdate }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Designation not found" },
        { status: 404 }
      );
    }
    
    // If designation name or department is updated, update employees using this designation
    if ((updateData.name && updateData.name !== currentDesignation.name) || 
        (updateData.department && updateData.department !== currentDesignation.department)) {
      
      // Check if employees are using this designation
      const employeesUsingDesignation = await db.collection("employees")
        .countDocuments({ designation: currentDesignation.name });
        
      if (employeesUsingDesignation > 0) {
        // Update employee records
        await db.collection("employees").updateMany(
          { designation: currentDesignation.name },
          { 
            $set: { 
              designation: updateData.name || currentDesignation.name,
              updatedAt: new Date().toISOString()
            } 
          }
        );
      }
    }
    
    // Return success response
    return NextResponse.json(
      { success: true, message: "Designation updated successfully" }
    );
  } catch (error) {
    console.error("Error updating designation:", error);
    return NextResponse.json(
      { error: "Failed to update designation" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a designation
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
        { error: "Designation ID is required" },
        { status: 400 }
      );
    }
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Check if designation exists
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid designation ID format" },
        { status: 400 }
      );
    }
    
    const designation = await db.collection("designations").findOne({ _id: objectId });
    
    if (!designation) {
      return NextResponse.json(
        { error: "Designation not found" },
        { status: 404 }
      );
    }
    
    // Check if designation is used in employees
    const employeesUsingDesignation = await db.collection("employees")
      .countDocuments({ designation: designation.name });
      
    if (employeesUsingDesignation > 0) {
      return NextResponse.json(
        { error: "Cannot delete designation that is in use by employees" },
        { status: 400 }
      );
    }
    
    // Delete from database
    const result = await db.collection("designations").deleteOne({ _id: objectId });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Designation not found" },
        { status: 404 }
      );
    }
    
    // Return success response
    return NextResponse.json(
      { success: true, message: "Designation deleted successfully" }
    );
  } catch (error) {
    console.error("Error deleting designation:", error);
    return NextResponse.json(
      { error: "Failed to delete designation" },
      { status: 500 }
    );
  }
}