import { prisma } from "./prisma";
import { startSequence, getOrCreateDefaultFollowUpSequence } from "./follow-up";

/**
 * Auto-create a deal when an AI-classified positive reply comes in.
 * Smart: only creates if no recent open deal already exists for this contact.
 */
export async function autoCreateDealFromReply({
  contactId,
  replySubject,
  contactName,
}: {
  contactId: string;
  replySubject: string;
  contactName: string;
}) {
  // Don't create if there's already an open deal for this contact
  const existing = await prisma.deal.findFirst({
    where: {
      contactId,
      stage: { notIn: ["won", "lost"] },
    },
  });
  if (existing) return { created: false, reason: "open_deal_exists", dealId: existing.id };

  // Try to link to the most recent campaign that emailed this contact
  const lastCampaignEmail = await prisma.emailMessage.findFirst({
    where: { contactId, direction: "outbound", campaignId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { campaignId: true },
  });

  // Pick the first active user as default owner (admin)
  const defaultOwner = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  // Default expected close date: 30 days from now
  const expectedClose = new Date();
  expectedClose.setDate(expectedClose.getDate() + 30);

  const deal = await prisma.deal.create({
    data: {
      title: `${contactName} — ${replySubject || "Inbound interest"}`.slice(0, 100),
      value: 0, // unknown until qualified
      stage: "lead",
      probability: 25, // bumped because they replied positively
      contactId,
      source: "ai_classification",
      campaignId: lastCampaignEmail?.campaignId || null,
      ownerId: defaultOwner?.id || null,
      expectedCloseDate: expectedClose,
      notes: "Auto-created from positive AI-classified reply.",
    },
  });

  return { created: true, dealId: deal.id };
}

/**
 * Get or create the default "Customer Onboarding" sequence that fires on won deals.
 */
export async function getOrCreateOnboardingSequence() {
  let sequence = await prisma.followUpSequence.findFirst({
    where: { name: "Customer Onboarding" },
    include: { steps: true },
  });
  if (sequence) return sequence;

  sequence = await prisma.followUpSequence.create({
    data: {
      name: "Customer Onboarding",
      description: "Welcome sequence sent to new customers when a deal closes (won).",
      isActive: true,
      triggerEvent: "deal_won",
      steps: {
        create: [
          {
            stepOrder: 0,
            channel: "email",
            subject: "Welcome to Synergific, {{name}}! 🎉",
            body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
<p>Hi {{name}},</p>
<p>Welcome to <strong>Synergific Software</strong>! We're thrilled to have <strong>{{company}}</strong> on board.</p>
<p>Our IT Operations team will be in touch shortly to schedule your kickoff call. In the meantime:</p>
<ul>
  <li>📚 Browse our knowledge base at <a href="https://synergificsoftware.com">synergificsoftware.com</a></li>
  <li>🛒 Visit our store for additional resources at <a href="https://store.synergificsoftware.com">store.synergificsoftware.com</a></li>
  <li>📞 Contact us anytime at +91 8884 907 660</li>
</ul>
<p>We make IT happen — and we're excited to make it happen for you.</p>
<p>Best regards,<br><strong>Synergific Cloud Team</strong><br>Synergific Software Pvt. Ltd.</p>
</div>`,
            delayMinutes: 5, // 5 min after won
          },
          {
            stepOrder: 1,
            channel: "email",
            subject: "How can we help you get started?",
            body: `<p>Hi {{name}},</p><p>It's been a couple of days since you joined us. How are things going at {{company}}?</p><p>If you need anything — questions about cloud migration, training, or onboarding — just reply to this email and our team will jump in.</p><p>Best,<br>Synergific Software Team</p>`,
            delayMinutes: 2 * 24 * 60, // 2 days later
          },
        ],
      },
    },
    include: { steps: true },
  });

  return sequence;
}

/**
 * Trigger the onboarding sequence when a deal is marked as won.
 */
export async function triggerOnboardingForWonDeal(dealId: string) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { contact: true },
  });
  if (!deal || deal.stage !== "won") return { triggered: false };

  // Mark contact as customer
  await prisma.contact.update({
    where: { id: deal.contactId },
    data: { status: "customer" },
  });

  const sequence = await getOrCreateOnboardingSequence();
  await startSequence(deal.contactId, sequence.id);

  return { triggered: true, contactId: deal.contactId };
}

/**
 * Compute weighted forecast for the pipeline.
 * Weighted = sum(deal.value * deal.probability / 100)
 */
export async function getForecast() {
  const deals = await prisma.deal.findMany({
    where: { stage: { notIn: ["won", "lost"] } },
    select: { value: true, probability: true, expectedCloseDate: true, stage: true },
  });

  const wonDeals = await prisma.deal.findMany({
    where: { stage: "won" },
    select: { value: true, wonAt: true, createdAt: true },
  });

  const totalPipeline = deals.reduce((sum, d) => sum + d.value, 0);
  const weightedForecast = deals.reduce((sum, d) => sum + (d.value * d.probability) / 100, 0);
  const wonRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);

  // This month forecast (deals with expectedCloseDate this month)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const thisMonthDeals = deals.filter((d) => {
    if (!d.expectedCloseDate) return false;
    return d.expectedCloseDate >= monthStart && d.expectedCloseDate <= monthEnd;
  });

  const thisMonthForecast = thisMonthDeals.reduce((sum, d) => sum + (d.value * d.probability) / 100, 0);
  const thisMonthBest = thisMonthDeals.reduce((sum, d) => sum + d.value, 0);

  // Already closed this month
  const wonThisMonth = wonDeals
    .filter((d) => {
      const closeDate = d.wonAt || d.createdAt;
      return closeDate >= monthStart && closeDate <= monthEnd;
    })
    .reduce((sum, d) => sum + d.value, 0);

  return {
    totalPipeline,
    weightedForecast,
    wonRevenue,
    openDealsCount: deals.length,
    wonDealsCount: wonDeals.length,
    thisMonth: {
      best: thisMonthBest,
      weighted: thisMonthForecast,
      won: wonThisMonth,
      total: thisMonthBest + wonThisMonth,
    },
  };
}
