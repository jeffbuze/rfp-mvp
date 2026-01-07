import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { put, del } from "@vercel/blob";
import { z } from "zod";

const rfpSchema = z.object({
  title: z.string().describe("The title of the bid document."),
  rawText: z
    .string()
    .describe("The raw text of the bid document in markdown format."),
  requirements: z.array(
    z.object({
      text: z.string().describe("The text of the requirement."),
      category: z.string().describe("The category of the requirement."),
    })
  ),
});

export async function POST(request: NextRequest) {
  let blobUrl: string | null = null;

  try {
    // Parse FormData from request
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();
    const fileName = `rfp-${Date.now()}-${file.name}`;

    // Upload to Vercel Blob storage
    const blob = await put(fileName, fileBuffer, {
      access: "public",
      contentType: "application/pdf",
    });

    blobUrl = blob.url;

    // Extract RFP data using Claude Sonnet 4.5
    if (!blobUrl) {
      throw new Error("Failed to upload file to blob storage");
    }

    const { output } = await generateText({
      model: "anthropic/claude-sonnet-4.5",
      output: Output.object({
        schema: rfpSchema,
      }),
      system:
        "You are a helpful assistant that extracts the title, raw text, and requirements organized into categories from an RFP document.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              data: new URL(blobUrl),
              mediaType: "application/pdf",
            },
          ],
        },
      ],
    });

    return NextResponse.json({ output });
  } catch (error) {
    console.error("Error processing RFP:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process RFP document",
      },
      { status: 500 }
    );
  } finally {
    // Clean up temporary blob file
    if (blobUrl) {
      try {
        await del(blobUrl);
      } catch (cleanupError) {
        console.error("Error cleaning up blob file:", cleanupError);
        // Don't fail the request if cleanup fails
      }
    }
  }
}
