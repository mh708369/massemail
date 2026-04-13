import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";

export async function GET() {
  try {
  const user = await getCurrentUser();

  // Apply ownership filter for non-admins
  const ownerFilter = user && !isAdmin(user) ? { ownerId: user.id } : {};

  // Compute forecast inline to apply scope
  const openDeals = await prisma.deal.findMany({
    where: { ...ownerFilter, stage: { notIn: ["won", "lost"] } },
    select: { value: true, probability: true, expectedCloseDate: true, stage: true },
  });

  const wonDealsAll = await prisma.deal.findMany({
    where: { ...ownerFilter, stage: "won" },
    select: { value: true, wonAt: true, createdAt: true },
  });

  const totalPipeline = openDeals.reduce((sum, d) => sum + d.value, 0);
  const weightedForecast = openDeals.reduce((sum, d) => sum + (d.value * d.probability) / 100, 0);
  const wonRevenue = wonDealsAll.reduce((sum, d) => sum + d.value, 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const thisMonthDeals = openDeals.filter((d) => {
    if (!d.expectedCloseDate) return false;
    return d.expectedCloseDate >= monthStart && d.expectedCloseDate <= monthEnd;
  });

  const thisMonthForecast = thisMonthDeals.reduce((sum, d) => sum + (d.value * d.probability) / 100, 0);
  const thisMonthBest = thisMonthDeals.reduce((sum, d) => sum + d.value, 0);

  const wonThisMonth = wonDealsAll
    .filter((d) => {
      const closeDate = d.wonAt || d.createdAt;
      return closeDate >= monthStart && closeDate <= monthEnd;
    })
    .reduce((sum, d) => sum + d.value, 0);

  // Add per-month time series for the last 6 months
  const months: { month: string; label: string; won: number; pipeline: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const ms = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const me = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const won = await prisma.deal.findMany({
      where: {
        ...ownerFilter,
        stage: "won",
        OR: [
          { wonAt: { gte: ms, lte: me } },
          { wonAt: null, updatedAt: { gte: ms, lte: me } },
        ],
      },
      select: { value: true },
    });

    const pipeline = await prisma.deal.findMany({
      where: { ...ownerFilter, createdAt: { gte: ms, lte: me } },
      select: { value: true },
    });

    months.push({
      month: ms.toISOString().slice(0, 7),
      label: ms.toLocaleDateString(undefined, { month: "short" }),
      won: won.reduce((sum, d) => sum + d.value, 0),
      pipeline: pipeline.reduce((sum, d) => sum + d.value, 0),
    });
  }

  // Pipeline by stage for funnel (scoped)
  const stages = ["lead", "qualified", "proposal", "negotiation", "won", "lost"];
  const stageData = await Promise.all(
    stages.map(async (stage) => {
      const deals = await prisma.deal.findMany({
        where: { ...ownerFilter, stage },
        select: { value: true },
      });
      return {
        stage: stage.charAt(0).toUpperCase() + stage.slice(1),
        count: deals.length,
        value: deals.reduce((sum, d) => sum + d.value, 0),
      };
    })
  );

  return NextResponse.json({
    totalPipeline,
    weightedForecast,
    wonRevenue,
    openDealsCount: openDeals.length,
    wonDealsCount: wonDealsAll.length,
    thisMonth: {
      best: thisMonthBest,
      weighted: thisMonthForecast,
      won: wonThisMonth,
      total: thisMonthBest + wonThisMonth,
    },
    monthlyHistory: months,
    pipelineByStage: stageData,
    scope: user && !isAdmin(user) ? "mine" : "all",
    isAdmin: isAdmin(user),
  });
  } catch (e) {
    console.error("[/api/sales/forecast GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
