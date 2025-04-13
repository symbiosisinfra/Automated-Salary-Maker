import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { handleApiError, extractPriceValue } from "@/lib/utils";

// Project interface
interface Project {
  category: string;
  projectName: string;
  developerName: string;
  location: string;
  totalLandParcel: string;
  numberOfTowers: string;
  numberOfFloors: string;
  totalNumberOfUnits: string | number;
  typologyAndSize: string[];
  constructionStatus: string;
  possessionDate: string;
  pricePerSqFt: string;
  baseUnitPrice: string;
  additionalCharges: string;
  totalStartingPrice: string;
  paymentPlan: string;
  clubhouseArea: string;
  nearbyLandmarks: string[];
  projectUSP: string[];
  rmContactDetails: string;
  nearbySocieties: string[];
  region: string;
  image: string;
}

// Helper function to check if user has admin permissions for create/update/delete operations
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

// GET all projects or filter by query parameters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const region = searchParams.get("region");
    const developer = searchParams.get("developer");
    const status = searchParams.get("status");
    const priceMin = searchParams.get("priceMin");
    const priceMax = searchParams.get("priceMax");
    const search = searchParams.get("search");
    const id = searchParams.get("id");

    const { db } = await connectToDatabase();

    // If id is provided, return a specific project
    if (id) {
      let objectId;
      try {
        objectId = new ObjectId(id);
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid project ID format" },
          { status: 400 }
        );
      }

      const project = await db
        .collection("projects")
        .findOne({ _id: objectId });

      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(project);
    }

    // Build filter for the database query
    let filter: any = {};

    if (category && category !== "All") {
      filter.category = category;
    }

    if (region && region !== "All") {
      filter.region = region;
    }

    if (developer && developer !== "All") {
      filter.developerName = developer;
    }

    if (status && status !== "All") {
      filter.constructionStatus = { $regex: status, $options: "i" };
    }

    // Handle price range filter
    if (priceMin || priceMax) {
      // For price filtering, we'll use the extractPriceValue utility
      // This is more complex because price is stored as a string like "2.5 Cr"
      // We could do this client-side, but for a robust solution,
      // we might want to store a numeric price field in the database
      // For now, we'll fetch all and filter client-side for price ranges
    }

    // Handle search term (search across multiple fields)
    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { projectName: { $regex: searchRegex } },
        { location: { $regex: searchRegex } },
        { developerName: { $regex: searchRegex } },
      ];
    }

    // Fetch projects with filters
    const projects = await db
      .collection("projects")
      .find(filter)
      .sort({ createdAt: -1 }) // Sort by most recently added first
      .toArray();

    // If we have price filters, apply them client-side
    let filteredProjects = projects;

    if (priceMin || priceMax) {
      filteredProjects = projects.filter((project) => {
        const price = extractPriceValue(project.totalStartingPrice);
        if (!price) return true; // Keep projects with unparseable prices

        if (priceMin && priceMax) {
          const min = extractPriceValue(priceMin);
          const max = extractPriceValue(priceMax);
          return min && max ? price >= min && price <= max : true;
        } else if (priceMin) {
          const min = extractPriceValue(priceMin);
          return min ? price >= min : true;
        } else if (priceMax) {
          const max = extractPriceValue(priceMax);
          return max ? price <= max : true;
        }

        return true;
      });
    }

    return NextResponse.json(filteredProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST - Create a new project
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

    // Validate required fields
    const requiredFields = [
      "projectName",
      "category",
      "location",
      "developerName",
      "constructionStatus",
    ];

    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: `Missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Connect to database
    const { db } = await connectToDatabase();

    // Check if project with same name already exists
    const existingProject = await db.collection("projects").findOne({
      projectName: { $regex: new RegExp(`^${body.projectName}$`, "i") },
    });

    if (existingProject) {
      return NextResponse.json(
        {
          error: "Project with this name already exists",
        },
        { status: 400 }
      );
    }

    // Ensure array fields are arrays
    const arrayFields = [
      "typologyAndSize",
      "nearbyLandmarks",
      "projectUSP",
      "nearbySocieties",
    ];
    arrayFields.forEach((field) => {
      if (body[field] && !Array.isArray(body[field])) {
        body[field] = [body[field]];
      } else if (!body[field]) {
        body[field] = [];
      }
    });

    // Add timestamps
    const now = new Date();
    const newProject = {
      ...body,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Insert into database
    const result = await db.collection("projects").insertOne(newProject);

    // Return the created project with its ID
    return NextResponse.json(
      {
        ...newProject,
        _id: result.insertedId,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "Failed to create project");
  }
}

// PATCH - Update a project
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

    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Get ID from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Validate ID format
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // Connect to database
    const { db } = await connectToDatabase();

    // Check if project exists
    const existingProject = await db
      .collection("projects")
      .findOne({ _id: objectId });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Ensure array fields remain arrays
    const arrayFields = [
      "typologyAndSize",
      "nearbyLandmarks",
      "projectUSP",
      "nearbySocieties",
    ];
    arrayFields.forEach((field) => {
      if (body[field] && !Array.isArray(body[field])) {
        body[field] = [body[field]];
      }
    });

    // Update timestamp
    const updateData = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // Update project in database
    const result = await db
      .collection("projects")
      .updateOne({ _id: objectId }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Return the updated project
    const updatedProject = await db
      .collection("projects")
      .findOne({ _id: objectId });

    return NextResponse.json(updatedProject);
  } catch (error) {
    return handleApiError(error, "Failed to update project");
  }
}

// DELETE - Delete a project
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
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Validate ID format
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // Connect to database
    const { db } = await connectToDatabase();

    // Check if project exists
    const project = await db.collection("projects").findOne({ _id: objectId });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete the project
    const result = await db.collection("projects").deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    return handleApiError(error, "Failed to delete project");
  }
}

// Optional: Endpoint to get distinct values for dropdowns
export async function OPTIONS(request: Request) {
  try {
    const { db } = await connectToDatabase();

    const categories = await db.collection("projects").distinct("category");
    const regions = await db.collection("projects").distinct("region");
    const developers = await db
      .collection("projects")
      .distinct("developerName");
    const statuses = await db
      .collection("projects")
      .distinct("constructionStatus");

    return NextResponse.json({
      categories,
      regions,
      developers,
      statuses,
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch dropdown options");
  }
}
