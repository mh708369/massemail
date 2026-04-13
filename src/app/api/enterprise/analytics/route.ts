import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const range = parseInt(searchParams.get("range") || "30"); // days

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - range);
  startDate.setHours(0, 0, 0, 0);

  // ── Overview counts ─────────────────────────
  const [
    totalContacts,
    totalDeals,
    totalTickets,
    totalCampaigns,
    totalEmails,
    totalWhatsApp,
    activeSequences,
    totalExecutions,
    openTickets,
    wonDeals,
    sentEmails,
    deliveredWA,
    inboundEmails,
    outboundEmails,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.deal.count(),
    prisma.ticket.count(),
    prisma.campaign.count(),
    prisma.emailMessage.count(),
    prisma.whatsAppMessage.count(),
    prisma.followUpSequence.count({ where: { isActive: true } }),
    prisma.followUpExecution.count({ where: { status: "active" } }),
    prisma.ticket.count({ where: { status: { in: ["open", "in_progress"] } } }),
    prisma.deal.findMany({ where: { stage: "won" } }),
    prisma.emailMessage.count({ where: { status: "sent" } }),
    prisma.whatsAppMessage.count({ where: { status: { in: ["sent", "delivered", "read"] } } }),
    prisma.emailMessage.count({ where: { direction: "inbound" } }),
    prisma.emailMessage.count({ where: { direction: "outbound" } }),
  ]);

  const totalRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);
  const allDeals = await prisma.deal.count();
  const winRate = allDeals > 0 ? ((wonDeals.length / allDeals) * 100).toFixed(1) : "0";
  const responseRate = outboundEmails > 0 ? ((inboundEmails / outboundEmails) * 100).toFixed(1) : "0";

  // ── Time series: emails per day ────────────────
  const emails = await prisma.emailMessage.findMany({
    where: { createdAt: { gte: startDate } },
    select: { createdAt: true, direction: true },
  });

  // Build a daily map
  const days: string[] = [];
  for (let i = 0; i < range; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }

  const emailsPerDay = days.map((day) => {
    const dayEmails = emails.filter((e) => e.createdAt.toISOString().slice(0, 10) === day);
    return {
      date: day,
      label: new Date(day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      sent: dayEmails.filter((e) => e.direction === "outbound").length,
      received: dayEmails.filter((e) => e.direction === "inbound").length,
    };
  });

  // ── Reply classification breakdown ─────────────
  const allInbound = await prisma.emailMessage.findMany({
    where: { direction: "inbound" },
    select: { aiClassification: true },
  });

  const classificationCounts = {
    positive: 0,
    negative: 0,
    question: 0,
    neutral: 0,
    unclassified: 0,
  };
  allInbound.forEach((e) => {
    const c = (e.aiClassification || "unclassified") as keyof typeof classificationCounts;
    if (c in classificationCounts) classificationCounts[c]++;
    else classificationCounts.unclassified++;
  });

  const classificationData = [
    { name: "Positive", value: classificationCounts.positive, color: "#10b981" },
    { name: "Question", value: classificationCounts.question, color: "#3b82f6" },
    { name: "Negative", value: classificationCounts.negative, color: "#f43f5e" },
    { name: "Neutral", value: classificationCounts.neutral, color: "#64748b" },
    { name: "Unclassified", value: classificationCounts.unclassified, color: "#f59e0b" },
  ];

  // ── Campaign performance (top 8) ───────────────
  const topCampaigns = await prisma.campaign.findMany({
    orderBy: { sentCount: "desc" },
    take: 8,
    select: { name: true, sentCount: true, openRate: true, clickRate: true, status: true },
  });

  const campaignData = topCampaigns.map((c) => ({
    name: c.name.length > 20 ? c.name.slice(0, 20) + "..." : c.name,
    sent: c.sentCount,
    open: c.openRate,
    click: c.clickRate,
  }));

  // ── Sales pipeline funnel ──────────────────────
  const stages = ["lead", "qualified", "proposal", "negotiation", "won", "lost"];
  const stageCountsRaw = await Promise.all(
    stages.map((stage) => prisma.deal.findMany({ where: { stage }, select: { value: true } }))
  );

  const pipelineData = stages.map((stage, i) => ({
    stage: stage.charAt(0).toUpperCase() + stage.slice(1),
    count: stageCountsRaw[i].length,
    value: stageCountsRaw[i].reduce((sum, d) => sum + d.value, 0),
  }));

  // ── Contact status breakdown ───────────────────
  const [leadCount, customerCount, churnedCount] = await Promise.all([
    prisma.contact.count({ where: { status: "lead" } }),
    prisma.contact.count({ where: { status: "customer" } }),
    prisma.contact.count({ where: { status: "churned" } }),
  ]);

  const contactStatusData = [
    { name: "Leads", value: leadCount, color: "#3b82f6" },
    { name: "Customers", value: customerCount, color: "#10b981" },
    { name: "Churned", value: churnedCount, color: "#f43f5e" },
  ];

  // ── Top performing contacts (by inbound count) ─
  const contactsWithEmails = await prisma.contact.findMany({
    take: 10,
    orderBy: { lastContactedAt: "desc" },
    where: { lastContactedAt: { not: null } },
    select: {
      id: true,
      name: true,
      company: true,
      _count: { select: { emailMessages: true } },
    },
  });

  const topContacts = contactsWithEmails
    .map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company,
      emailCount: c._count.emailMessages,
    }))
    .sort((a, b) => b.emailCount - a.emailCount)
    .slice(0, 8);

  // ── Today vs yesterday comparison ──────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const [emailsToday, emailsYesterday, contactsToday, contactsYesterday] = await Promise.all([
    prisma.emailMessage.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.emailMessage.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
    prisma.contact.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.contact.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
  ]);

  const emailTrend = emailsYesterday > 0 ? ((emailsToday - emailsYesterday) / emailsYesterday) * 100 : 0;
  const contactTrend = contactsYesterday > 0 ? ((contactsToday - contactsYesterday) / contactsYesterday) * 100 : 0;

  return NextResponse.json({
    range,
    overview: {
      totalContacts,
      totalDeals,
      totalTickets,
      totalCampaigns,
      contactTrend: Math.round(contactTrend),
    },
    communications: {
      totalEmails,
      totalWhatsApp,
      sentEmails,
      deliveredWA,
      inboundEmails,
      outboundEmails,
      responseRate,
      emailTrend: Math.round(emailTrend),
    },
    sales: { totalRevenue, winRate, wonCount: wonDeals.length },
    support: { openTickets },
    automation: { activeSequences, totalExecutions },
    charts: {
      emailsPerDay,
      classificationData,
      campaignData,
      pipelineData,
      contactStatusData,
      topContacts,
    },
  });
  } catch (e) {
    console.error("[/api/enterprise/analytics GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
