import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai";

export async function POST(req: Request) {
  const { goal, audience, tone } = await req.json();

  const systemPrompt = `You are an expert email marketing copywriter. Generate professional marketing emails that drive engagement and conversions. Always respond with valid JSON.`;

  const userMessage = `Create a marketing email with the following details:
- Campaign Goal: ${goal}
- Target Audience: ${audience}
- Tone: ${tone || "professional"}

Respond in this exact JSON format:
{
  "subject": "Email subject line",
  "content": "Full email body in HTML format with proper formatting"
}`;

  try {
    const response = await generateText(systemPrompt, userMessage);
    const parsed = JSON.parse(response);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate email", details: String(error) },
      { status: 500 }
    );
  }
}
