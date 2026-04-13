import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/ai";

export async function POST(req: Request) {
  const { dealId } = await req.json();

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      contact: true,
      activities: { include: { user: true }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  // Get recent emails with this contact
  const emails = await prisma.emailMessage.findMany({
    where: { contactId: deal.contact.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { direction: true, subject: true, body: true, aiClassification: true, aiSummary: true, createdAt: true },
  });

  const systemPrompt = `You are an elite AI Sales Coach for Synergific Software. You analyze deals deeply and give actionable, specific coaching to sales reps. You know:
- Synergific sells IT services (Cloud, DevOps, AI/ML, Cybersecurity) and 200+ training courses
- The sales team works leads through stages: lead → qualified → proposal → negotiation → won/lost
- You should be direct, specific, and tactical (not generic advice)

Always respond with valid JSON.`;

  const activitiesText = deal.activities.length > 0
    ? deal.activities.map((a) => `[${a.createdAt.toISOString().slice(0, 10)}] ${a.type}: ${a.description}`).join("\n")
    : "No activities logged yet";

  const emailsText = emails.length > 0
    ? emails.map((e) => `[${e.createdAt.toISOString().slice(0, 10)}] ${e.direction}: ${e.subject || "(no subject)"}${e.aiSummary ? ` — AI: ${e.aiSummary}` : ""}`).join("\n")
    : "No emails exchanged yet";

  const userMessage = `Coach me on this deal:

DEAL: ${deal.title}
Value: ₹${deal.value.toLocaleString()}
Stage: ${deal.stage}
Probability: ${deal.probability}%
Days in pipeline: ${Math.round((Date.now() - deal.createdAt.getTime()) / 86400000)}
Expected close: ${deal.expectedCloseDate?.toISOString().slice(0, 10) || "Not set"}
Notes: ${deal.notes || "None"}

CONTACT: ${deal.contact.name} (${deal.contact.email})
Company: ${deal.contact.company || "Unknown"}

ACTIVITIES:
${activitiesText}

EMAIL HISTORY:
${emailsText}

Analyze this deal and respond with this exact JSON:
{
  "healthScore": 0-100,
  "healthStatus": "hot" | "warm" | "stalled" | "at_risk",
  "summary": "1-2 sentence health assessment",
  "redFlags": ["list of specific concerns"],
  "opportunities": ["list of leverage points"],
  "nextActions": [
    {"priority": "high|medium|low", "action": "specific action", "why": "reasoning"}
  ],
  "talkingPoints": ["3-5 key things to mention next time you talk"],
  "expectedCloseDate": "YYYY-MM-DD or null if uncertain",
  "estimatedWinProbability": 0-100
}`;

  try {
    const text = await generateText(systemPrompt, userMessage);
    const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const result = JSON.parse(cleaned);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to coach", details: String(error) }, { status: 500 });
  }
}
