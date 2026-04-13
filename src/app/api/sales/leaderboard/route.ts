import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "month";

  // Compute date range
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  if (range === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    startDate = new Date(now.getFullYear(), q * 3, 1);
  } else if (range === "year") {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else if (range === "all") {
    startDate = new Date(0);
  }

  // Get all active users
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true },
  });

  // For each user: count won deals, total revenue, open deals, activities
  const leaderboard = await Promise.all(
    users.map(async (user) => {
      const [wonDeals, openDeals, activities, contactsOwned] = await Promise.all([
        prisma.deal.findMany({
          where: {
            ownerId: user.id,
            stage: "won",
            OR: [
              { wonAt: { gte: startDate } },
              { wonAt: null, updatedAt: { gte: startDate } },
            ],
          },
          select: { value: true },
        }),
        prisma.deal.findMany({
          where: { ownerId: user.id, stage: { notIn: ["won", "lost"] } },
          select: { value: true, probability: true },
        }),
        prisma.activity.count({
          where: { userId: user.id, createdAt: { gte: startDate } },
        }),
        prisma.contact.count(),
      ]);

      // Get user's target if any
      const target = await prisma.salesTarget.findFirst({
        where: { ownerId: user.id, startDate: { lte: now }, endDate: { gte: now } },
      });

      const wonRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);
      const openPipeline = openDeals.reduce((sum, d) => sum + d.value, 0);
      const weightedPipeline = openDeals.reduce((sum, d) => sum + (d.value * d.probability) / 100, 0);
      const targetAttainment = target && target.targetAmount > 0
        ? Math.round((wonRevenue / target.targetAmount) * 100)
        : null;

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        wonRevenue,
        wonCount: wonDeals.length,
        openPipeline,
        weightedPipeline,
        activities,
        target: target?.targetAmount || null,
        targetAttainment,
      };
    })
  );

  // Sort by won revenue (desc)
  leaderboard.sort((a, b) => b.wonRevenue - a.wonRevenue);

  // Team totals
  const teamTotals = {
    wonRevenue: leaderboard.reduce((s, u) => s + u.wonRevenue, 0),
    wonCount: leaderboard.reduce((s, u) => s + u.wonCount, 0),
    openPipeline: leaderboard.reduce((s, u) => s + u.openPipeline, 0),
    weightedPipeline: leaderboard.reduce((s, u) => s + u.weightedPipeline, 0),
    activities: leaderboard.reduce((s, u) => s + u.activities, 0),
  };

  return NextResponse.json({ range, leaderboard, teamTotals });
  } catch (e) {
    console.error("[/api/sales/leaderboard GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
