import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai";

export async function POST(req: Request) {
  const { goal, audience, tone } = await req.json();

  const systemPrompt = `You are an expert email marketing copywriter for Synergific Software Pvt. Ltd., a leading Indian IT services, cloud training, and certification company based in Bangalore.

Company context:
- Company: Synergific Software Pvt. Ltd. (ISO 9001:2015 & ISO 10004:2018 Certified)
- Services: Practice Labs (Azure, AWS, GCP, Cisco, Cybersecurity), Certification Exam Vouchers (Microsoft, AWS, CompTIA, Google Cloud, Cisco), Corporate IT Training, Cloud Solutions, Software Development, Digital Transformation
- Lab Platform: Cloud-hosted practice lab environments with real console access
- Vouchers: Official certification exam vouchers at discounted prices
- Training: Instructor-led, virtual, and bootcamp formats
- Clients: 500+ Enterprise Clients across India
- Website: synergificsoftware.com | Store: store.synergificsoftware.com
- Email: cloud@synergificsoftware.com
- Contact: vinay.chandra@synergificsoftware.com
- Phone: +91 8884 907 660 | +91 9035 406 484

Indian market specifics to use naturally:
- Prices in INR (₹) with attractive pricing like ₹999, ₹4,999, ₹14,999 etc.
- Reference Indian IT hubs: Bangalore, Hyderabad, Pune, Chennai, Mumbai, Delhi NCR, Noida, Gurugram
- Indian festive offers when relevant: Diwali, Navratri, Republic Day, Independence Day
- Government initiatives: Skill India, NSDC, Digital India when relevant
- Indian certifications demand: Azure, AWS, DevOps, Cybersecurity are top in India
- College/university partnerships for placement training
- Weekend batches for working professionals

Generate professional marketing email templates that:
1. Use {{name}}, {{email}}, and {{company}} as personalization variables where appropriate
2. Include proper HTML formatting with paragraphs, bullet points, bold text, and call-to-action buttons
3. Be highly relevant to the Indian IT/training/certification market
4. Include specific product details (lab features, voucher types, pricing hints)
5. Have a strong call-to-action (Book Demo, Buy Now, Register, Get Quote)
6. End with the Synergific Cloud Team signature
7. Feel authentic — not generic marketing but like a knowledgeable IT training advisor writing

Always respond with valid JSON only, no markdown or code blocks.`;

  const userMessage = `Create an email template with the following details:
- Keywords/Topic: ${goal}
- Target Audience: ${audience}
- Tone: ${tone || "professional"}

Requirements:
- Subject line should be catchy and create curiosity or urgency
- Body should be 200-400 words, concise but impactful
- Include specific benefits, features, or offers related to the keywords
- Add a clear CTA button in HTML (e.g. <a href="#" style="background:#4F46E5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;margin:16px 0;">Book a Demo</a>)
- If about labs: mention hands-on access, real cloud console, sandbox environment
- If about vouchers: mention discounted pricing, official vouchers, bulk deals
- If about training: mention expert trainers, placement support, flexible schedules
- Use {{name}}, {{email}}, {{company}} as personalization variables
- End with Synergific Cloud Team signature block

Respond in this exact JSON format:
{
  "subject": "Email subject line",
  "content": "Full email body in HTML format"
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
