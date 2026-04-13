import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

/**
 * PUT /api/handoffs/[id]
 * Body: { decision: "approve" | "reject", reviewNote?, overrideToUserId? }
 *
 * Admin-only. On approve, also reassigns the contact to toUserId (or to
 * overrideToUserId if the admin picks a different person).
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { decision, reviewNote, overrideToUserId } = await req.json();
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  try {
    const handoffsClient = (prisma as unknown as {
      leadHandoffRequest: {
        findUnique: (args: unknown) => Promise<
          | {
              id: string;
              contactId: string;
              toUserId: string | null;
              requesterId: string;
              status: string;
            }
          | null
        >;
        update: (args: unknown) => Promise<{ id: string; status: string }>;
      };
    }).leadHandoffRequest;

    const handoff = await handoffsClient.findUnique({ where: { id } });
    if (!handoff) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (handoff.status !== "pending") {
      return NextResponse.json({ error: "Already reviewed" }, { status: 400 });
    }

    const newStatus = decision === "approve" ? "approved" : "rejected";

    await handoffsClient.update({
      where: { id },
      data: {
        status: newStatus,
        reviewNote: reviewNote || null,
        reviewerId: user.id,
        reviewedAt: new Date(),
      },
    });

    // On approve: reassign the contact
    let newOwnerId: string | null = null;
    if (decision === "approve") {
      newOwnerId = overrideToUserId ?? handoff.toUserId ?? null;
      await prisma.contact.update({
        where: { id: handoff.contactId },
        data: { ownerId: newOwnerId },
      });
    }

    await logAction({
      userId: user.id,
      action: `handoff.${decision}`,
      entity: "contact",
      entityId: handoff.contactId,
      details: {
        handoffId: id,
        newOwnerId,
        reviewNote: reviewNote || null,
      },
    });

    // Notify the requester of the decision
    await prisma.notification.create({
      data: {
        userId: handoff.requesterId,
        type: `handoff_${newStatus}`,
        title: `Handoff ${newStatus}`,
        message:
          decision === "approve"
            ? "Your lead handoff request was approved."
            : `Your lead handoff request was rejected.${reviewNote ? ` Note: ${reviewNote}` : ""}`,
        link: `/contacts/${handoff.contactId}`,
      },
    });

    return NextResponse.json({ success: true, status: newStatus, newOwnerId });
  } catch (e) {
    console.error("[/api/handoffs/[id] PUT]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
