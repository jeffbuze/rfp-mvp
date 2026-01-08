import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { put, del } from "@vercel/blob";
import { z } from "zod";

const bidSchema = z.object({
  title: z.string().describe("The title for the bid including the company name and project name."),
  rawText: z
    .string()
    .describe("The raw text of the bid document in markdown format."),
  totalCost: z.number().describe("The total cost of the bid."),
  timeline: z.string().describe("The timeline for the bid."),
  requirements: z.array(
    z.object({
      text: z.string().describe("The text of the requirement."),
      category: z.string().describe("The category of the requirement."),
      isSatisfied: z
        .boolean()
        .describe("Whether the requirement is satisfied."),
      reason: z
        .string()
        .describe("The reason for the requirement being satisfied or not."),
    })
  ),
});

export async function POST(request: NextRequest) {
  let blobUrl: string | null = null;

  try {
    // Parse FormData from request
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const requirementsJson = formData.get("requirements") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!requirementsJson) {
      return NextResponse.json(
        { error: "No requirements provided" },
        { status: 400 }
      );
    }

    // Parse requirements
    let requirements: Array<{ text: string; category: string }>;
    try {
      requirements = JSON.parse(requirementsJson);
    } catch {
      return NextResponse.json(
        { error: "Invalid requirements JSON" },
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
    const fileName = `bid-${Date.now()}-${file.name}`;

    // Upload to Vercel Blob storage
    const blob = await put(fileName, fileBuffer, {
      access: "public",
      contentType: "application/pdf",
    });

    blobUrl = blob.url;

    // Extract bid data and assess against RFP requirements using Claude Sonnet 4.5
    if (!blobUrl) {
      throw new Error("Failed to upload file to blob storage");
    }

    // Format requirements for the prompt
    const requirementsText = requirements
      .map((req, index) => `${index + 1}. [${req.category}] ${req.text}`)
      .join("\n");

    const { output } = await generateText({
      model: "anthropic/claude-haiku-4.5",
      output: Output.object({
        schema: bidSchema,
      }),
      system:
        "You are a helpful assistant that extracts information from bid documents and assesses them against RFP requirements. For each requirement provided, determine if the bid satisfies it and provide a clear reason for your assessment.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              data: new URL(blobUrl),
              mediaType: "application/pdf",
            },
            {
              type: "text",
              text: `Please extract the title and raw text from this bid document, then assess it against the following RFP requirements. For each requirement, determine if it is satisfied by the bid and provide a reason.\n\nRFP Requirements:\n${requirementsText}`,
            },
          ],
        },
      ],
    });

    return NextResponse.json({ output });
  } catch (error) {
    console.error("Error processing bid:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process bid document",
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
