import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { put, del } from "@vercel/blob";
import { z } from "zod";

const bidSchema = z.object({
  title: z.string(),
  description: z.string(),
  requirements: z.array(z.string()),
  budget: z.number(),
  timeline: z.string(),
  contact: z.string(),
});

export async function POST(request: NextRequest) {

    const { output } = await generateText({
        model: "anthropic/claude-sonnet-4.5",
        output: Output.object({
          schema: bidSchema,
        }),
        system:
          "You are a helpful assistant that extracts the title, description, requirements, budget, timeline, and contact from a RFP document.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "file",
                data: 'dataURL goes here',
                mediaType: "application/pdf",
              },
            ],
          },
        ],
      });

    return NextResponse.json({ output })
}