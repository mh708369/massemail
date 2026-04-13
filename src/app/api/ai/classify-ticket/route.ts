import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai";

export async function POST(req: Request) {
  const { subject, description } = await req.json();

  const systemPrompt = `You are an AI support ticket classifier. Analyze support tickets and classify them by category and priority. Also suggest a helpful initial response. Always respond with valid JSON.`;

  const userMessage = `Classify this support ticket:

Subject: ${subject}
Description: ${description}

Respond in this exact JSON format:
{
  "category": "billing|technical|general|feature_request|bug_report",
  "priority": "low|medium|high|urgent",
  "suggestedResponse": "A helpful initial response to the customer",
  "reasoning": "Brief explanation of the classification"
}`;

  try {
    const response = await generateText(systemPrompt, userMessage);
    const parsed = JSON.parse(response);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to classify ticket", details: String(error) },
      { status: 500 }
    );
  }
}
