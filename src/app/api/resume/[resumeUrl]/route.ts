// app/api/resume/[resumeUrl]/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { resumeUrl: string } }
) {
  try {
    // Decode the URL parameter
    const resumeUrl = decodeURIComponent(params.resumeUrl);

    // Fetch the file from S3
    const response = await fetch(resumeUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch resume" },
        { status: response.status }
      );
    }

    // Get the file content as ArrayBuffer
    const fileBuffer = await response.arrayBuffer();

    // Get content type from original response
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    // Create a new response with the file content
    const newResponse = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="resume${getFileExtension(
          contentType
        )}"`,
      },
    });

    return newResponse;
  } catch (error) {
    console.error("Error proxying resume download:", error);
    return NextResponse.json(
      { error: "Failed to download resume" },
      { status: 500 }
    );
  }
}

// Helper function to get file extension
function getFileExtension(mimeType: string): string {
  const extensions: { [key: string]: string } = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "text/plain": ".txt",
  };
  return extensions[mimeType] || ".file";
}
