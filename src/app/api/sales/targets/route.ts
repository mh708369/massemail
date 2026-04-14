import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function GET() {
  try {
  const user = await getCurrentUser();

  // Non-admins only see their own targets (or team-wide targets with no owner)
  const where: Record<string, unknown> = {};
  if (user && !isAdmin(user)) {
    where.OR = [{ ownerId: user.id }, { ownerId: null }];
  }

  const targets = await prisma.salesTarget.findMany({
    where,
    orderBy: { startDate: "desc" },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });

  // Compute progress for each target
  const enriched = await Promise.all(
    targets.map(async (t) => {
      const wonDeals = await prisma.deal.findMany({
        where: {
          stage: "won",
          ...(t.ownerId ? { ownerId: t.ownerId } : {}),
          OR: [
            { wonAt: { gte: t.startDate, lte: t.endDate } },
            { wonAt: null, updatedAt: { gte: t.startDate, lte: t.endDate } },
          ],
        },
      });
      const achieved = wonDeals.reduce((sum, d) => sum + d.value, 0);
      return {
        ...t,
        achieved,
        achievedPct: t.targetAmount > 0 ? Math.round((achieved / t.targetAmount) * 100) : 0,
        dealsCount: wonDeals.length,
      };
    })
  );

  return NextResponse.json(enriched);
  } catch (e) {
    console.error("[/api/sales/targets GET]", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
  const data = await req.json();
  const user = await getCurrentUser();

  // Only admins can create team-wide targets or targets for other users
  // Non-admins can only create their own targets
  let ownerId = data.ownerId || null;
  if (user && !isAdmin(user)) {
    ownerId = user.id;
  }

  const target = await prisma.salesTarget.create({
    data: {
      period: data.period || "monthly",
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      targetAmount: parseFloat(data.targetAmount),
      ownerId,
      notes: data.notes || null,
    },
  });

  logAction({ userId: user!.id, action: "sales_target.create", entity: "sales_target", entityId: target.id, details: { period: data.period, targetAmount: data.targetAmount } }).catch(() => {});

  return NextResponse.json(target);
  } catch (e) {
    console.error("[/api/sales/targets POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
