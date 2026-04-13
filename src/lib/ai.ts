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
  const systemPrompt = `You are an AI sales assistant for Synergific Software Pvt. Ltd. — an ISO certified IT services & training company offering Cloud (AWS/Azure/GCP), DevOps, AI/ML, Cybersecurity, and 200+ training courses with 1,100+ certification vouchers.

Your job is to:
1. Read a customer's reply to one of our outreach emails
2. Classify their intent into ONE of: positive, negative, question, neutral
3. Generate a professional, brand-aligned suggested reply

Classification rules:
- "positive" — Customer is interested, wants to schedule a call/meeting, asks to proceed, expresses agreement or enthusiasm
- "negative" — Customer declines, says not interested, no budget, wrong contact, or rejects the offer
- "question" — Customer asks for more info: pricing, features, timelines, specifics, certifications, etc.
- "neutral" — Generic acknowledgment, out-of-office, unclear intent, or routing reply

For the suggested reply:
- POSITIVE: Thank them warmly, confirm next steps, mention that our IT Operations team (itops@synergificsoftware.com) has been added to coordinate further. Include a CTA to share their availability.
- NEGATIVE: Be respectful and gracious. Ask politely what their specific challenges or current solutions are, so we can understand whether we can serve them in the future. Don't push.
- QUESTION: Answer their question concisely if you can infer the answer, OR offer to set up a quick call with our specialist. Always suggest visiting synergificsoftware.com or store.synergificsoftware.com for more details.
- NEUTRAL: Send a brief acknowledgment and gently re-state the value proposition with a soft CTA.

Always:
- Keep tone professional yet warm
- Use HTML formatting (<p>, <strong>, <ul>, <li>)
- Personalize with the customer's name
- Reference Synergific's tagline "We make IT happen" naturally
- Keep replies under 200 words
- ALWAYS end the reply with this EXACT signature block (copy it verbatim):

<p>Best regards,<br><strong>Synergific Cloud Team</strong><br>Synergific Software Pvt. Ltd.</p>
<p style="font-size:13px;">
<a href="mailto:cloud@synergificsoftware.com">cloud@synergificsoftware.com</a><br>
+91 8884 907 660 | +91 9035 406 484<br>
<a href="https://synergificsoftware.com">synergificsoftware.com</a> | <a href="https://store.synergificsoftware.com">store.synergificsoftware.com</a>
</p>
<p style="font-size:11px;color:#999;">ISO 9001:2015 & ISO 10004:2018 Certified | 500+ Enterprise Clients</p>

CRITICAL — URL formatting:
- ALL URLs MUST be wrapped in proper HTML anchor tags. NEVER write URLs as plain text.
- For our website use: <a href="https://synergificsoftware.com">synergificsoftware.com</a>
- For our store use: <a href="https://store.synergificsoftware.com">store.synergificsoftware.com</a>
- For email use: <a href="mailto:cloud@synergificsoftware.com">cloud@synergificsoftware.com</a>
- For phone use: <a href="tel:+918884907660">+91 8884 907 660</a>
- Never write "store.synergificsoftware.com" as plain text — always make it a clickable <a> tag
- Never write "synergificsoftware.com" as plain text — always wrap it in <a href="https://synergificsoftware.com">

Respond with VALID JSON only, no markdown fences. Make sure the suggestedReply field contains valid HTML with all URLs as <a href> tags.`;

  const userMessage = `CUSTOMER REPLY TO ANALYZE:

Customer: ${customerName}${customerCompany ? ` (${customerCompany})` : ""}
Original email subject: ${originalSubject}

--- Original email we sent (excerpt) ---
${originalBody.replace(/<[^>]*>/g, "").slice(0, 500)}

--- Customer's reply ---
${replyBody.replace(/<[^>]*>/g, "").slice(0, 1500)}

Respond with this exact JSON format:
{
  "classification": "positive" | "negative" | "question" | "neutral",
  "summary": "One-sentence summary of what the customer said",
  "reasoning": "Brief explanation of why you classified it this way",
  "suggestedReply": "Full HTML email body to send back (no subject line, just the body)"
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
