import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

/**
 * GET /api/handoffs
 *   Admins:    all handoffs (default sort: pending first, newest first)
 *   Non-admin: only handoffs they requested
 *   ?status=pending|approved|rejected to filter
 *   ?scope=incoming  → admin-only: pending requests waiting for review
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const scope = searchParams.get("scope");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  if (!isAdmin(user)) {
    where.requesterId = user.id;
  } else if (scope === "incoming") {
    where.status = "pending";
  }

  try {
    // Manual joins to dodge stale Prisma client
    const rows = await (prisma as unknown as {
      leadHandoffRequest: {
        findMany: (args: unknown) => Promise<
          Array<{
            id: string;
            contactId: string;
            reason: string;
            toUserId: string | null;
            status: string;
            reviewNote: string | null;
            createdAt: Date;
            reviewedAt: Date | null;
            requesterId: string;
            reviewerId: string | null;
          }>
        >;
      };
    }).leadHandoffRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    });

    // Stitch contact + user data
    const contactIds = Array.from(new Set(rows.map((r) => r.contactId)));
    const userIds = Array.from(
      new Set(
        rows
          .flatMap((r) => [r.requesterId, r.toUserId, r.reviewerId])
          .filter(Boolean) as string[]
      )
    );
    const [contacts, users] = await Promise.all([
      prisma.contact.findMany({
        where: { id: { in: contactIds } },
        select: { id: true, name: true, email: true, company: true },
      }),
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      }),
    ]);
    const contactById = new Map(contacts.map((c) => [c.id, c]));
    const userById = new Map(users.map((u) => [u.id, u]));

    const enriched = rows.map((r) => ({
      ...r,
      contact: contactById.get(r.contactId) || null,
      requester: userById.get(r.requesterId) || null,
      toUser: r.toUserId ? userById.get(r.toUserId) || null : null,
      reviewer: r.reviewerId ? userById.get(r.reviewerId) || null : null,
    }));

    return NextResponse.json(enriched);
  } catch (e) {
    console.error("[/api/handoffs GET]", e);
    return NextResponse.json([], { status: 200 });
  }
}

/**
 * POST /api/handoffs
 * Body: { contactId, reason, toUserId? }
 *
 * Any authenticated user can request a handoff for a contact they currently
 * own (or an unassigned one). Admins typically don't need this — they can
 * reassign directly — but it works for them too.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contactId, reason, toUserId } = await req.json();
  if (!contactId || !reason?.trim()) {
    return NextResponse.json({ error: "contactId and reason are required" }, { status: 400 });
  }

  // Check the user actually has access to this contact
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, name: true, ownerId: true },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  if (!isAdmin(user) && contact.ownerId !== user.id && contact.ownerId !== null) {
    return NextResponse.json({ error: "You don't own this lead" }, { status: 403 });
  }

  try {
    const created = await (prisma as unknown as {
      leadHandoffRequest: { create: (args: unknown) => Promise<{ id: string }> };
    }).leadHandoffRequest.create({
      data: {
        contactId,
        reason: reason.trim(),
        toUserId: toUserId || null,
        requesterId: user.id,
        status: "pending",
      },
    });

    await logAction({
      userId: user.id,
      action: "handoff.request",
      entity: "contact",
      entityId: contactId,
      details: { handoffId: created.id, reason, toUserId: toUserId || null },
    });

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: "admin", isActive: true },
      select: { id: true },
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: "handoff_request",
          title: `Handoff requested: ${contact.name}`,
          message: `${user.name} requested a handoff. Reason: ${reason.slice(0, 120)}`,
          link: `/enterprise/handoffs`,
        })),
      });
    }

    return NextResponse.json({ success: true, id: created.id });
  } catch (e) {
    console.error("[/api/handoffs POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
