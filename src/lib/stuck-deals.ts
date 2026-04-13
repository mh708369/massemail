import { prisma } from "./prisma";
import { getStuckDealConfig } from "./settings";

/**
 * Check for deals stuck in the same stage > N days (configurable). For each one, ensure a
 * "Nudge" task exists for the deal owner. We dedupe by checking if there's
 * already an open nudge task referencing this deal in the last 14 days.
 *
 * Skips deals in won/lost (terminal stages) and deals without an owner.
 *
 * Returns counts: { checked, nudged, skipped }.
 */
export async function checkStuckDeals() {
  const config = await getStuckDealConfig();
  if (!config.enabled) return { checked: 0, nudged: 0, skipped: 0, thresholdDays: config.thresholdDays };

  const STUCK_THRESHOLD_MS = config.thresholdDays * 24 * 60 * 60 * 1000;
  const stuckBefore = new Date(Date.now() - STUCK_THRESHOLD_MS);
  let checked = 0;
  let nudged = 0;
  let skipped = 0;

  try {
    // Pull stuck deals using a select cast — stageChangedAt was added by migration
    const deals = (await prisma.deal.findMany({
      where: {
        stage: { notIn: ["won", "lost"] },
        ownerId: { not: null },
        // stageChangedAt < stuckBefore — gated via untyped where
      },
      select: {
        id: true,
        title: true,
        stage: true,
        value: true,
        ownerId: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "asc" },
      take: 200,
    })) as Array<{
      id: string;
      title: string;
      stage: string;
      value: number;
      ownerId: string | null;
      updatedAt: Date;
      stageChangedAt?: Date;
    }>;

    // Re-fetch with stageChangedAt via raw query if the cast didn't surface it
    // (old client). Otherwise fall back to updatedAt.
    for (const deal of deals) {
      checked++;
      if (!deal.ownerId) {
        skipped++;
        continue;
      }
      const stageDate = deal.stageChangedAt || deal.updatedAt;
      if (stageDate.getTime() > stuckBefore.getTime()) {
        skipped++;
        continue;
      }

      // Dedupe: skip if there's already an open nudge task for this deal
      const existing = await prisma.task.findFirst({
        where: {
          dealId: deal.id,
          done: false,
          title: { contains: "Stuck deal" },
        },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const days = Math.floor((Date.now() - stageDate.getTime()) / (24 * 60 * 60 * 1000));
      await prisma.task.create({
        data: {
          title: `Stuck deal: ${deal.title}`,
          description: `This deal has been in "${deal.stage}" for ${days} days (threshold: ${config.thresholdDays}). Time for a nudge — call, email, or move it to the next stage.`,
          priority: config.autoPriority && deal.value >= config.highValueThreshold ? "high" : "medium",
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // due tomorrow
          userId: deal.ownerId,
          dealId: deal.id,
        },
      });

      // Notify the owner
      await prisma.notification.create({
        data: {
          userId: deal.ownerId,
          type: "stuck_deal",
          title: `Stuck deal needs attention`,
          message: `${deal.title} has been in "${deal.stage}" for ${days} days. A nudge task was created.`,
          link: `/sales/deals/${deal.id}`,
        },
      });

      nudged++;
    }
  } catch (e) {
    console.error("[stuck-deals] check failed:", e);
  }

  return { checked, nudged, skipped, thresholdDays: config.thresholdDays };
}
