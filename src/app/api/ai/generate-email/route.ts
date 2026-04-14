import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai";

export async function POST(req: Request) {
  const { goal, audience, tone } = await req.json();

  const systemPrompt = `You are an expert email marketing copywriter for Synergific Software Pvt. Ltd., an Indian IT services and training company.

Company context:
- Company: Synergific Software Pvt. Ltd.
- Services: IT Services, Cloud Solutions, Software Development, Digital Transformation, Training Programs
- Email: cloud@synergificsoftware.com
- Contact: vinay.chandra@synergificsoftware.com
- Phone: +91 8884 907 660 | +91 9035 406 484

Generate professional marketing email templates that:
1. Use {{name}}, {{email}}, and {{company}} as personalization variables where appropriate
2. Include proper HTML formatting with paragraphs, bullet points etc.
3. Be relevant to the Indian IT/training market
4. End with a professional signature for "Synergific Cloud Team"
5. Drive engagement and conversions

Always respond with valid JSON only, no markdown or code blocks.`;

  const userMessage = `Create an email template with the following details:
- Keywords/Topic: ${goal}
- Target Audience: ${audience}
- Tone: ${tone || "professional"}

Respond in this exact JSON format:
{
  "subject": "Email subject line (use {{company}} or {{name}} if relevant)",
  "content": "Full email body in HTML format with proper formatting. Use {{name}}, {{email}}, {{company}} as variables. Include a Synergific Cloud Team signature at the end."
}`;

  try {
    const response = await generateText(systemPrompt, userMessage);
    // Try to parse JSON, handle cases where AI wraps in code blocks
    let cleaned = response.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate email", details: String(error) },
      { status: 500 }
    );
  }
}
