import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateText(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = response.content[0];
  if (block.type === "text") {
    return block.text;
  }
  return "";
}

export async function streamText(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[]
) {
  return anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });
}

export interface ReplyClassification {
  classification: "positive" | "negative" | "question" | "neutral";
  summary: string;
  reasoning: string;
  suggestedReply: string;
}

/**
 * Classify a customer email reply and generate an appropriate response.
 * Used by the inbox sync to automatically respond to replies.
 */
export async function classifyReply({
  customerName,
  customerCompany,
  originalSubject,
  originalBody,
  replyBody,
}: {
  customerName: string;
  customerCompany?: string | null;
  originalSubject: string;
  originalBody: string;
  replyBody: string;
}): Promise<ReplyClassification> {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const today = now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const currentYear = now.getFullYear();

  const systemPrompt = `You are an intelligent sales assistant for Synergific Software Pvt. Ltd. — an ISO 9001:2015 & ISO 10004:2018 certified IT services & training company based in Bangalore.

TODAY: ${today}. Current year: ${currentYear}. NEVER use wrong dates or years.

COMPANY CONTEXT:
- Practice Labs: Cloud-hosted hands-on lab environments (Azure, AWS, GCP, Cisco, Cybersecurity, DevOps) — browser-based, real console access, starting ₹800/seat
- Certification Vouchers: Official exam vouchers for Microsoft (AZ-900/104/204/500), AWS (SAA-C03, CLF-C02), CompTIA (A+/Security+/Network+), Google Cloud, Cisco — discounted bulk pricing
- Training: 200+ courses, instructor-led + virtual, corporate upskilling, college partnerships, weekend batches
- IT Services: Cloud migration, managed services, DevOps automation, cybersecurity consulting, custom software development
- Clients: 500+ enterprise clients across India
- Store: store.synergificsoftware.com (labs + vouchers)
- Website: synergificsoftware.com
- Email: cloud@synergificsoftware.com | vinay.chandra@synergificsoftware.com
- Phone: +91 8884 907 660 | +91 9035 406 484

YOUR CRITICAL TASK:
1. CAREFULLY read the FULL conversation — our original email AND the customer's reply
2. UNDERSTAND what we offered, what they responded with, and what the logical next step is
3. Classify intent: positive / negative / question / neutral
4. Write a CONTEXTUAL reply that directly addresses what the customer said

REPLY RULES — READ CAREFULLY:
- Your reply MUST directly reference what the customer said. If they asked about pricing, answer pricing. If they suggested a time, confirm the time. If they redirected to another team, acknowledge and ask for the right contact.
- NEVER send a generic "thank you for your interest" reply when the customer said something specific
- If customer gives a meeting time → confirm that exact time, mention vinay.chandra@synergificsoftware.com will send a calendar invite
- If customer asks about a specific product/service → give specific details about THAT product, not generic company info
- If customer says "wrong department" or redirects → acknowledge, apologize for the mismatch, and ask who the right person would be
- If customer asks for pricing → give realistic price ranges (labs: ₹800-₹2,500/seat/month, vouchers: ₹3,500-₹25,000 depending on cert, training: ₹15,000-₹1,50,000 per batch)
- If customer is negative → be gracious, don't push, ask if we can help in the future
- Keep replies 100-200 words. Be concise, no fluff
- Address the customer by first name
- Use HTML: <p>, <strong>, <ul>, <li>
- ALL URLs must be <a href> tags, never plain text

SIGNATURE — append this EXACT block at the end:
<p>Best regards,<br><strong>Synergific Cloud Team</strong><br>Synergific Software Pvt. Ltd.</p>
<p style="font-size:13px;"><a href="mailto:cloud@synergificsoftware.com">cloud@synergificsoftware.com</a><br>+91 8884 907 660 | +91 9035 406 484<br><a href="https://synergificsoftware.com">synergificsoftware.com</a> | <a href="https://store.synergificsoftware.com">store.synergificsoftware.com</a></p>
<p style="font-size:11px;color:#999;">ISO 9001:2015 & ISO 10004:2018 Certified | 500+ Enterprise Clients</p>

Respond with VALID JSON only. No markdown fences.`;

  const userMessage = `ANALYZE THIS EMAIL CONVERSATION AND WRITE A CONTEXTUAL REPLY:

Customer: ${customerName}${customerCompany ? ` (Company: ${customerCompany})` : ""}
Subject: ${originalSubject}

=== OUR ORIGINAL EMAIL (what we sent to them) ===
${originalBody.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1000)}

=== CUSTOMER'S REPLY (what they wrote back) ===
${replyBody.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000)}

INSTRUCTIONS:
- Read BOTH emails carefully
- Understand what we pitched and what they responded
- Write a reply that DIRECTLY addresses their specific response
- If they mentioned a time/date, confirm it
- If they asked something specific, answer it
- If they redirected us, acknowledge it
- Do NOT write a generic template reply

Respond in this JSON format:
{
  "classification": "positive" | "negative" | "question" | "neutral",
  "summary": "One-sentence summary of what the customer actually said",
  "reasoning": "Why you classified it this way based on their specific words",
  "suggestedReply": "Contextual HTML reply that directly addresses their message"
}`;

  const text = await generateText(systemPrompt, userMessage);

  // Strip any code fences just in case
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      classification: "neutral",
      summary: "Unable to parse AI classification",
      reasoning: "JSON parse error",
      suggestedReply: `<p>Hi ${customerName},</p><p>Thank you for getting back to me. I'd love to discuss further — when would be a good time for a quick call?</p><p>Best regards,<br><strong>Synergific Cloud Team</strong><br>Synergific Software Pvt. Ltd.</p><p style="font-size:13px;"><a href="mailto:cloud@synergificsoftware.com">cloud@synergificsoftware.com</a><br>+91 8884 907 660 | +91 9035 406 484<br><a href="https://synergificsoftware.com">synergificsoftware.com</a> | <a href="https://store.synergificsoftware.com">store.synergificsoftware.com</a></p><p style="font-size:11px;color:#999;">ISO 9001:2015 &amp; ISO 10004:2018 Certified | 500+ Enterprise Clients</p>`,
    };
  }
}

export { anthropic };
