import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";

/**
 * Live counts for sidebar badges. Scoped to the current user unless admin.
 *
 * Returns:
 *   leads      — total leads owned by the user (or all for admin)
 *   inbox      — unread / unclassified inbound emails the user can see
 *   tasks      — open tasks for the user
 *   tickets    — open tickets assigned to the user (or unassigned)
 *   deals      — active (non-won, non-lost) deals owned by the user
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ leads: 0, inbox: 0, tasks: 0, tickets: 0, deals: 0 });
  }

  const adminUser = isAdmin(user);
  const ownedOrUnassigned = { OR: [{ ownerId: user.id }, { ownerId: null }] };
  const assignedOrUnassigned = { OR: [{ assignedToId: user.id }, { assignedToId: null }] };

  // Pending handoffs — admins see global pending; non-admins see their own pending
  let handoffsCount = 0;
  try {
    handoffsCount = await (prisma as unknown as {
      leadHandoffRequest: { count: (args: unknown) => Promise<number> };
    }).leadHandoffRequest.count({
      where: {
        status: "pending",
        ...(adminUser ? {} : { requesterId: user.id }),
      },
    });
  } catch {
    // Stale Prisma client — fall through with 0
  }

  const [leads, inbox, tasks, tickets, deals] = await Promise.all([
    prisma.contact.count({
      where: {
        status: "lead",
        ...(adminUser ? {} : ownedOrUnassigned),
      },
    }),
    prisma.emailMessage.count({
      where: {
        direction: "inbound",
        ...(adminUser ? {} : { OR: [{ userId: user.id }, { userId: null }] }),
      },
    }),
    prisma.task.count({
      where: {
        done: false,
        ...(adminUser ? {} : { userId: user.id }),
      },
    }),
    prisma.ticket.count({
      where: {
        status: { not: "closed" },
        ...(adminUser ? {} : assignedOrUnassigned),
      },
    }),
    prisma.deal.count({
      where: {
        stage: { notIn: ["won", "lost"] },
        ...(adminUser ? {} : { ownerId: user.id }),
      },
    }),
  ]);

  return NextResponse.json({ leads, inbox, tasks, tickets, deals, handoffs: handoffsCount });
}
