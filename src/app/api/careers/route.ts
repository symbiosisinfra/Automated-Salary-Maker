// app/api/careers/route.ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { connectToDatabase } from "../../../lib/mongodb";

// Career application status types
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

// Get all career applications
export async function GET(request: Request) {
  try {
    // Authenticate request
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to the database
    const { db } = await connectToDatabase();

    // Get all career applications
    const careers = await db
      .collection("careers")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(careers, { status: 200 });
  } catch (error) {
    console.error("Error fetching career applications:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Update career application status
export async function PATCH(request: Request) {
  try {
    // Authenticate request
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { id, status } = data;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Connect to the database
    const { db } = await connectToDatabase();

    const result = await db.collection("careers").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: status,
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
      { message: "Status updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating status:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Delete a career application
export async function DELETE(request: Request) {
  try {
    // Authenticate request
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    // Connect to the database
    const { db } = await connectToDatabase();

    const result = await db
      .collection("careers")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Career application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Application deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting application:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
