import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerOnboardingForWonDeal } from "@/lib/sales";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      contact: true,
      owner: { select: { id: true, name: true, email: true } },
      campaign: { select: { id: true, name: true } },
      activities: { include: { user: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(deal);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();

  // Detect won/lost transitions to set timestamps
  const existing = await prisma.deal.findUnique({ where: { id } });
  if (data.stage === "won" && existing?.stage !== "won") {
    data.wonAt = new Date();
  }
  if (data.stage === "lost" && existing?.stage !== "lost") {
    data.lostAt = new Date();
  }
  // Track stage transitions for stuck-deal nudges (best-effort: ignore if stale client)
  const isStageTransition = data.stage && existing && data.stage !== existing.stage;
  if (isStageTransition) {
    // Auto-clear any open "stuck deal" task — they moved it
    try {
      await prisma.task.updateMany({
        where: { dealId: id, done: false, title: { contains: "Stuck deal" } },
        data: { done: true, completedAt: new Date() },
      });
    } catch {}
    // Try the typed path; if the Prisma client doesn't know stageChangedAt yet,
    // patch via raw SQL after the main update
    try {
      data.stageChangedAt = new Date();
    } catch {}
  }

  let deal;
  try {
    deal = await prisma.deal.update({
      where: { id },
      data,
      include: { contact: true, owner: true, campaign: true },
    });
  } catch (e) {
    // Stale client may reject `stageChangedAt` — retry without it
    if (String(e).includes("stageChangedAt")) {
      delete data.stageChangedAt;
      deal = await prisma.deal.update({
        where: { id },
        data,
        include: { contact: true, owner: true, campaign: true },
      });
      // And patch stageChangedAt via raw SQL
      if (isStageTransition) {
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE "Deal" SET "stageChangedAt" = ? WHERE id = ?`,
            new Date().toISOString(),
            id
          );
        } catch {}
      }
    } else {
      throw e;
    }
  }

  // Trigger onboarding sequence on won + notify
  if (data.stage === "won" && existing?.stage !== "won") {
    try {
      await triggerOnboardingForWonDeal(id);
      const { notifyAdmins } = await import("@/lib/notifications");
      await notifyAdmins({
        type: "deal_won",
        title: "🎉 Deal Won!",
        message: `${deal.title} (₹${deal.value.toLocaleString()}) was just closed.`,
        link: `/sales/deals/${id}`,
      });
    } catch (e) {
      console.error("[deal] Won handlers failed:", e);
    }
  }

  // Notify on lost deal
  if (data.stage === "lost" && existing?.stage !== "lost") {
    try {
      const { notifyAdmins } = await import("@/lib/notifications");
      await notifyAdmins({
        type: "deal_lost",
        title: "Deal Lost",
        message: `${deal.title} marked as lost.`,
        link: `/sales/deals/${id}`,
      });
    } catch (e) {
      console.error("[deal] Lost notification failed:", e);
    }
  }

  // Audit log stage transition or update
  const user = await getCurrentUser();
  if (user) {
    logAction({
      userId: user.id,
      action: isStageTransition ? "deal.stage_change" : "deal.update",
      entity: "deal",
      entityId: id,
      details: {
        title: deal.title,
        ...(isStageTransition ? { from: existing?.stage, to: data.stage } : { fields: Object.keys(data) }),
      },
    }).catch(() => {});
  }

  return NextResponse.json(deal);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await prisma.deal.findUnique({ where: { id }, select: { title: true, value: true } });
  await prisma.deal.delete({ where: { id } });

  const user = await getCurrentUser();
  if (user) {
    logAction({
      userId: user.id,
      action: "deal.delete",
      entity: "deal",
      entityId: id,
      details: { title: deal?.title, value: deal?.value },
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
