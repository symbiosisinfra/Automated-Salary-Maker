// app/api/careers/[id]/route.ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

// Get a single career application by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate request
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;

    // Connect to the database
    const { db } = await connectToDatabase();

    // Find the career application by ID
    const career = await db.collection("careers").findOne({
      _id: new ObjectId(id),
    });

    if (!career) {
      return NextResponse.json(
        { error: "Career application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(career, { status: 200 });
  } catch (error) {
    console.error("Error fetching career application:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Update a career application by ID
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate request
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;
    const data = await request.json();

    // Validate data
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    // Connect to the database
    const { db } = await connectToDatabase();

    // Update the career application
    const result = await db.collection("careers").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Career application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Career application updated successfully",
        modifiedCount: result.modifiedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating career application:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Delete a career application by ID
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate request
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;

    // Connect to the database
    const { db } = await connectToDatabase();

    // Delete the career application
    const result = await db.collection("careers").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Career application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Career application deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting career application:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
