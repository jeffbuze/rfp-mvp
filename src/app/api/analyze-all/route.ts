import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { z } from "zod";

const analysisSchema = z.object({
  recommendation: z.string().describe("The recommendation for the best bid."),
  recommendationReason: z.string().describe("The reason for the recommendation."),
  openQuestions: z.array(
    z.object({
      companyName: z.string().describe("The name of the company."),
      openQuestions: z.array(
        z.string().describe("The open questions to clarify the bid.")
      ),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const { rfp, bids } = await request.json();

    if (!rfp) {
      return NextResponse.json(
        { error: "RFP data is required" },
        { status: 400 }
      );
    }

    if (!bids || !Array.isArray(bids) || bids.length === 0) {
      return NextResponse.json(
        { error: "At least one bid is required" },
        { status: 400 }
      );
    }

    // Format RFP requirements for the prompt
    const rfpRequirementsText = rfp.requirements
      .map(
        (req: { text: string; category: string }, index: number) =>
          `${index + 1}. [${req.category}] ${req.text}`
      )
      .join("\n");

    // Format bids data for the prompt
    interface BidRequirement {
      text: string;
      category: string;
      isSatisfied: boolean;
      reason: string;
    }

    interface Bid {
      title: string;
      totalCost: number;
      timeline: string;
      requirements: BidRequirement[];
    }

    const bidsSummary = bids
      .map((bid: Bid, index: number) => {
        const satisfied = bid.requirements.filter(
          (r: BidRequirement) => r.isSatisfied
        ).length;
        const total = bid.requirements.length;
        return `Bid ${index + 1}: ${bid.title}
- Total Cost: $${bid.totalCost.toLocaleString()}
- Timeline: ${bid.timeline}
- Requirements Satisfied: ${satisfied}/${total} (${Math.round(
          (satisfied / total) * 100
        )}%)
- Requirements Details:
${bid.requirements
  .map(
    (r: BidRequirement) =>
      `  • [${r.category}] ${r.text} - ${r.isSatisfied ? "SATISFIED" : "NOT SATISFIED"}: ${r.reason}`
  )
  .join("\n")}`;
      })
      .join("\n\n");

    const { output } = await generateText({
      model: "anthropic/claude-sonnet-4.5",
      output: Output.object({
        schema: analysisSchema,
      }),
      system:
        "You are an expert procurement analyst that compares multiple bids against an RFP. Analyze all bids comprehensively, considering cost, timeline, requirement satisfaction, and overall fit. Identify the best bid with clear reasoning and generate specific, actionable open questions for each company based on gaps, ambiguities, or clarifications needed in their proposals.",
      messages: [
        {
          role: "user",
          content: `Please analyze the following RFP and all submitted bids. Provide a recommendation for the best bid with clear reasoning, and generate specific open questions for each company that should be asked to clarify their proposals.

RFP Title: ${rfp.title}

RFP Requirements:
${rfpRequirementsText}

Submitted Bids:
${bidsSummary}

Please provide:
1. A clear recommendation for which bid is best
2. Detailed reasoning for your recommendation
3. Specific open questions for each company that should be asked to clarify gaps, ambiguities, or areas needing more detail in their proposals.`,
        },
      ],
    });

    return NextResponse.json({ output });
  } catch (error) {
    console.error("Error analyzing bids:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze bids",
      },
      { status: 500 }
    );
  }
}