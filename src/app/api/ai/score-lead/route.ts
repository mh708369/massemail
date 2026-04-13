import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai";

export async function POST(req: Request) {
  const { contact, activities } = await req.json();

  const systemPrompt = `You are a lead scoring AI analyst. Evaluate leads based on their profile and engagement data. Always respond with valid JSON.`;

  const userMessage = `Score this lead on a scale of 1-100 based on their likelihood to convert:

Contact Info:
- Name: ${contact.name}
- Email: ${contact.email}
- Company: ${contact.company || "Unknown"}
- Source: ${contact.source || "Unknown"}
- Status: ${contact.status}

Recent Activities: ${activities?.length ? activities.map((a: { type: string; description: string }) => `${a.type}: ${a.description}`).join("; ") : "No activities recorded"}

Respond in this exact JSON format:
{
  "score": 75,
  "reasoning": "Brief explanation of the score",
  "suggestions": ["Action item 1", "Action item 2"]
}`;

  try {
    const response = await generateText(systemPrompt, userMessage);
    const parsed = JSON.parse(response);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to score lead", details: String(error) },
      { status: 500 }
    );
  }
}
