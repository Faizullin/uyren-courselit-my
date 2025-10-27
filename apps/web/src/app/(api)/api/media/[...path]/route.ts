import { LocalStorageService } from "@/server/services/local-storage";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

/**
 * API route to serve local storage files
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{
    path: string[]
  }> }
) {
  try {
    // Get the file path from the URL
    const filePath = (await params).path.join("/");

    if (!filePath) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 }
      );
    }

    // Security check: prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes("..") || normalizedPath.startsWith("/")) {
      return NextResponse.json(
        { error: "Invalid file path" },
        { status: 400 }
      );
    }

    // Check if file exists
    const exists = await LocalStorageService.fileExists(filePath);
    if (!exists) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Get the file
    const fileBuffer = await LocalStorageService.getFile(filePath);

    // Determine content type from file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    const contentType = contentTypeMap[ext] || "application/octet-stream";

    // Return the file with appropriate headers
    return new Response(fileBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("Error serving media file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

