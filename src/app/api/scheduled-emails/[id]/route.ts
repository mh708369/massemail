import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

/** PUT /api/scheduled-emails/[id] — update (reschedule or cancel) */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = await req.json();

    const existing = await prisma.scheduledEmail.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.status === "sent") {
      return NextResponse.json({ error: "Cannot modify a sent email" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.templateId !== undefined) updateData.templateId = data.templateId;
    if (data.autoFollowUp !== undefined) updateData.autoFollowUp = data.autoFollowUp;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.contactIds !== undefined) {
      updateData.contactIds = JSON.stringify(
        Array.isArray(data.contactIds) ? data.contactIds : JSON.parse(data.contactIds)
      );
    }
    if (data.scheduledAt) {
      const newDate = new Date(data.scheduledAt);
      if (newDate.getTime() <= Date.now()) {
        return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
      }
      updateData.scheduledAt = newDate;
    }

    const updated = await prisma.scheduledEmail.update({ where: { id }, data: updateData });

    logAction({
      userId: user.id,
      action: data.status === "cancelled" ? "scheduled_email.cancel" : "scheduled_email.update",
      entity: "scheduled_email",
      entityId: id,
      details: { name: updated.name },
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[/api/scheduled-emails/[id] PUT]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/** DELETE /api/scheduled-emails/[id] — delete */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.scheduledEmail.findUnique({ where: { id }, select: { name: true } });
    await prisma.scheduledEmail.delete({ where: { id } });

    logAction({
      userId: user.id,
      action: "scheduled_email.delete",
      entity: "scheduled_email",
      entityId: id,
      details: { name: existing?.name },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[/api/scheduled-emails/[id] DELETE]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
