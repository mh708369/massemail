import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

/** GET /api/scheduled-emails — list all scheduled emails */
export async function GET() {
  try {
    const emails = await prisma.scheduledEmail.findMany({
      orderBy: { scheduledAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Parse contactIds and enrich with contact names
    const enriched = await Promise.all(
      emails.map(async (e) => {
        let contacts: Array<{ id: string; name: string; email: string }> = [];
        try {
          const ids: string[] = JSON.parse(e.contactIds);
          if (ids.length > 0) {
            contacts = await prisma.contact.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true, email: true },
            });
          }
        } catch {}
        return { ...e, contacts, contactCount: contacts.length };
      })
    );

    return NextResponse.json(enriched);
  } catch (e) {
    console.error("[/api/scheduled-emails GET]", e);
    return NextResponse.json([], { status: 200 });
  }
}

/** POST /api/scheduled-emails — create a new scheduled email */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();

    if (!data.subject || !data.body || !data.contactIds || !data.scheduledAt) {
      return NextResponse.json(
        { error: "subject, body, contactIds, and scheduledAt are required" },
        { status: 400 }
      );
    }

    const scheduledAt = new Date(data.scheduledAt);
    if (isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    if (scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
    }

    const contactIds = Array.isArray(data.contactIds) ? data.contactIds : JSON.parse(data.contactIds);

    const scheduled = await prisma.scheduledEmail.create({
      data: {
        name: data.name || `Scheduled Email — ${scheduledAt.toLocaleString()}`,
        subject: data.subject,
        body: data.body,
        templateId: data.templateId || null,
        contactIds: JSON.stringify(contactIds),
        scheduledAt,
        autoFollowUp: data.autoFollowUp ?? true,
        userId: user.id,
      },
    });

    logAction({
      userId: user.id,
      action: "scheduled_email.create",
      entity: "scheduled_email",
      entityId: scheduled.id,
      details: { name: scheduled.name, contactCount: contactIds.length, scheduledAt: scheduledAt.toISOString() },
    }).catch(() => {});

    return NextResponse.json(scheduled);
  } catch (e) {
    console.error("[/api/scheduled-emails POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
