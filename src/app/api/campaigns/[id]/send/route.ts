import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, parseTemplate } from "@/lib/email";
import { getCurrentUser } from "@/lib/rbac";

/**
 * Send a campaign to a list of contacts (or all leads if not specified).
 * Body: { contactIds?: string[], audienceFilter?: { status?: string }, autoFollowUp?: boolean }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { contactIds, audienceFilter, autoFollowUp = true } = await req.json();
  const user = await getCurrentUser();
  const senderUserId = user?.id || null;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (!campaign.subject || !campaign.content) {
    return NextResponse.json({ error: "Campaign missing subject or content" }, { status: 400 });
  }

  // Resolve audience with filtering
  let targetIds: string[] = contactIds || [];
  if (!targetIds.length) {
    const where: Record<string, unknown> = {};
    if (audienceFilter?.status) where.status = audienceFilter.status;
    if (audienceFilter?.source) where.source = audienceFilter.source;
    if (audienceFilter?.tags) where.tags = { contains: audienceFilter.tags };
    if (audienceFilter?.hasCompany) where.company = { not: null };
    // Default: all leads if no filter specified
    if (Object.keys(where).length === 0) where.status = "lead";
    const contacts = await prisma.contact.findMany({ where, select: { id: true } });
    targetIds = contacts.map((c) => c.id);
  }

  if (!targetIds.length) {
    return NextResponse.json({ error: "No contacts match the audience filter" }, { status: 400 });
  }

  const contacts = await prisma.contact.findMany({
    where: { id: { in: targetIds } },
  });

  const stats = { total: contacts.length, sent: 0, failed: 0 };

  // A/B test split: half get subject, half get subjectB (if enabled)
  const useAB = campaign.abTestEnabled && campaign.subjectB;

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const variables = {
      name: contact.name,
      email: contact.email,
      company: contact.company || "your business",
    };

    // A/B: alternate odd/even rows
    const subjectToUse = useAB && i % 2 === 1 ? campaign.subjectB! : campaign.subject;

    const personalizedSubject = parseTemplate(subjectToUse!, variables);
    const personalizedBody = parseTemplate(campaign.content!, variables);

    // Send from the contact's owner if assigned, else from the admin who launched the campaign
    const result = await sendEmail({
      to: contact.email,
      subject: personalizedSubject,
      body: personalizedBody,
      contactId: contact.id,
      autoFollowUp,
      senderUserId: contact.ownerId || senderUserId,
    });

    if (result.success) {
      // Link the email message to this campaign
      if (result.emailId) {
        await prisma.emailMessage.update({
          where: { id: result.emailId },
          data: { campaignId: id },
        });
      }
      stats.sent++;
    } else {
      stats.failed++;
    }
  }

  // Update campaign stats
  await prisma.campaign.update({
    where: { id },
    data: {
      status: "active",
      sentAt: new Date(),
      sentCount: { increment: stats.sent },
    },
  });

  return NextResponse.json({ success: true, ...stats });
}
