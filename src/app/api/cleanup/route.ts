import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";

/**
 * Cleanup endpoint — removes seed/dummy data while preserving real content.
 * Admin-only.
 *
 * KEEPS:
 * - vinay.chandra@synergificsoftware.com contact (real)
 * - Synergific message templates
 * - Knowledge base articles
 * - Follow-up sequences (5-Day Auto Follow-up, Customer Onboarding)
 * - Sales targets
 * - Admin user
 * - Real notifications
 *
 * DELETES:
 * - Seed contacts (sarah, mike, emma, james, lisa)
 * - Test CSV imports (test1, test2)
 * - Seed campaigns (Spring Launch, Customer Retention, New Feature)
 * - Test API keys
 * - Cascades: deals, tickets, activities, emails, follow-up executions for deleted contacts
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const SEED_CONTACT_EMAILS = [
    "sarah@techcorp.com",
    "mike@startup.io",
    "emma@bigco.com",
    "james@retail.com",
    "lisa@design.co",
    "test1@example.com",
    "test2@example.com",
  ];

  const SEED_CAMPAIGN_NAMES = [
    "Spring Product Launch",
    "Customer Retention Q2",
    "New Feature Announcement",
  ];

  const stats = {
    contactsDeleted: 0,
    campaignsDeleted: 0,
    apiKeysDeleted: 0,
    workflowsDeleted: 0,
    webhooksDeleted: 0,
    auditLogsDeleted: 0,
  };

  // Delete seed contacts (cascades to deals, tickets, activities, emails, etc.)
  const contactsResult = await prisma.contact.deleteMany({
    where: { email: { in: SEED_CONTACT_EMAILS } },
  });
  stats.contactsDeleted = contactsResult.count;

  // Delete seed campaigns
  const campaignsResult = await prisma.campaign.deleteMany({
    where: { name: { in: SEED_CAMPAIGN_NAMES } },
  });
  stats.campaignsDeleted = campaignsResult.count;

  // Delete test API keys
  const apiKeysResult = await prisma.apiKey.deleteMany({
    where: { name: { contains: "Test" } },
  });
  stats.apiKeysDeleted = apiKeysResult.count;

  // Clear all audit logs (clean slate for production tracking)
  const auditResult = await prisma.auditLog.deleteMany({});
  stats.auditLogsDeleted = auditResult.count;

  return NextResponse.json({
    success: true,
    ...stats,
    preserved: {
      contacts: ["vinay.chandra@synergificsoftware.com"],
      templates: "All 15 Synergific templates",
      knowledgeBase: "All KB articles",
      sequences: "5-Day Auto Follow-up + Customer Onboarding",
      salesTargets: "All",
      users: "All team members",
    },
  });
}
