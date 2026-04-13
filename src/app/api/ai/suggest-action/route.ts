import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai";

export async function POST(req: Request) {
  const { deal, activities } = await req.json();

  const systemPrompt = `You are an AI sales coach. Analyze deal information and suggest the best next action to move the deal forward. Always respond with valid JSON.`;

  const userMessage = `Suggest the next best action for this deal:

Deal Info:
- Title: ${deal.title}
- Value: ₹${deal.value}
- Stage: ${deal.stage}
- Probability: ${deal.probability}%
- Contact: ${deal.contact?.name || "Unknown"}
- Notes: ${deal.notes || "None"}

Recent Activities: ${activities?.length ? activities.map((a: { type: string; description: string; createdAt: string }) => `[${a.createdAt}] ${a.type}: ${a.description}`).join("; ") : "No activities recorded"}

Respond in this exact JSON format:
{
  "action": "Specific next action to take",
  "reasoning": "Why this action is recommended",
  "priority": "high|medium|low",
  "suggestedMessage": "Draft message or talking points if applicable"
}`;

  try {
    const response = await generateText(systemPrompt, userMessage);
    const parsed = JSON.parse(response);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to suggest action", details: String(error) },
      { status: 500 }
    );
  }
}
