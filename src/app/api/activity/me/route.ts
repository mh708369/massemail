import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

/**
 * GET /api/activity/me
 *
 * Returns a unified, chronological feed of everything the current user has
 * touched recently. Aggregates across multiple sources:
 *   - emails sent (EmailMessage where userId = me)
 *   - contacts created (Contact where ownerId = me)
 *   - tasks completed (Task where userId = me, done = true)
 *   - deals updated (Deal where ownerId = me)
 *   - WhatsApp messages sent (WhatsAppMessage where userId = me)
 *
 * Each entry has a unified shape: { id, type, title, subtitle, link, at, icon }
 * Sorted desc by `at`. Capped at 100.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // last 14 days

  const [sentEmails, createdContacts, completedTasks, updatedDeals, sentWhatsApp] = await Promise.all([
    prisma.emailMessage.findMany({
      where: { userId: user.id, direction: "outbound", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { contact: { select: { id: true, name: true, email: true } } },
    }),
    prisma.contact.findMany({
      where: { ownerId: user.id, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, name: true, email: true, status: true, createdAt: true },
    }),
    prisma.task.findMany({
      where: { userId: user.id, done: true, completedAt: { gte: since } },
      orderBy: { completedAt: "desc" },
      take: 50,
      select: { id: true, title: true, completedAt: true },
    }),
    prisma.deal.findMany({
      where: { ownerId: user.id, updatedAt: { gte: since } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { contact: { select: { id: true, name: true } } },
    }),
    // WhatsApp may not exist on stale Prisma client
    (async () => {
      try {
        return await (prisma as unknown as {
          whatsAppMessage: {
            findMany: (args: unknown) => Promise<
              Array<{
                id: string;
                content: string;
                createdAt: Date;
                contactId: string;
                contact: { id: string; name: string } | null;
              }>
            >;
          };
        }).whatsAppMessage.findMany({
          where: { userId: user.id, direction: "outbound", createdAt: { gte: since } },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { contact: { select: { id: true, name: true } } },
        });
      } catch {
        return [];
      }
    })(),
  ]);

  type Item = {
    id: string;
    type: "email_sent" | "contact_created" | "task_completed" | "deal_updated" | "whatsapp_sent";
    title: string;
    subtitle: string;
    link: string | null;
    at: string;
  };

  const items: Item[] = [
    ...sentEmails.map((e) => ({
      id: `em-${e.id}`,
      type: "email_sent" as const,
      title: `Sent email to ${e.contact?.name || e.toAddr}`,
      subtitle: e.subject,
      link: e.contact ? `/contacts/${e.contact.id}` : null,
      at: e.createdAt.toISOString(),
    })),
    ...createdContacts.map((c) => ({
      id: `co-${c.id}`,
      type: "contact_created" as const,
      title: `Added ${c.name}`,
      subtitle: `${c.email} · ${c.status}`,
      link: `/contacts/${c.id}`,
      at: c.createdAt.toISOString(),
    })),
    ...completedTasks.map((t) => ({
      id: `tk-${t.id}`,
      type: "task_completed" as const,
      title: `Completed task`,
      subtitle: t.title,
      link: `/tasks`,
      at: (t.completedAt || new Date()).toISOString(),
    })),
    ...updatedDeals.map((d) => ({
      id: `dl-${d.id}`,
      type: "deal_updated" as const,
      title: `${d.title} · ${d.stage}`,
      subtitle: `${d.contact?.name || ""} · ₹${d.value.toLocaleString("en-IN")}`,
      link: `/sales/deals/${d.id}`,
      at: d.updatedAt.toISOString(),
    })),
    ...sentWhatsApp.map((w) => ({
      id: `wa-${w.id}`,
      type: "whatsapp_sent" as const,
      title: `WhatsApp to ${w.contact?.name || ""}`,
      subtitle: w.content.slice(0, 80),
      link: w.contact ? `/contacts/${w.contact.id}` : null,
      at: w.createdAt.toISOString(),
    })),
  ];

  items.sort((a, b) => b.at.localeCompare(a.at));

  return NextResponse.json(items.slice(0, 100));
}
