import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel");
  const search = searchParams.get("search");

  const [emails, whatsapps] = await Promise.all([
    channel === "whatsapp"
      ? Promise.resolve([])
      : prisma.emailMessage.findMany({
          orderBy: { createdAt: "desc" },
          include: { contact: true },
          ...(search
            ? { where: { OR: [{ subject: { contains: search } }, { body: { contains: search } }, { contact: { name: { contains: search } } }] } }
            : {}),
        }),
    channel === "email"
      ? Promise.resolve([])
      : prisma.whatsAppMessage.findMany({
          orderBy: { createdAt: "desc" },
          include: { contact: true },
          take: 100,
          ...(search
            ? { where: { OR: [{ content: { contains: search } }, { contact: { name: { contains: search } } }] } }
            : {}),
        }),
  ]);

  const unified = [
    ...emails.map((e) => ({
      id: e.id,
      channel: "email" as const,
      direction: e.direction,
      contactName: e.contact.name,
      contactId: e.contactId,
      subject: e.subject,
      preview: e.body.replace(/<[^>]*>/g, "").slice(0, 120),
      status: e.status,
      createdAt: e.createdAt,
      aiClassification: (e as { aiClassification?: string | null }).aiClassification ?? null,
      aiSummary: (e as { aiSummary?: string | null }).aiSummary ?? null,
      aiReplied: (e as { aiReplied?: boolean }).aiReplied ?? false,
    })),
    ...whatsapps.map((w) => ({
      id: w.id,
      channel: "whatsapp" as const,
      direction: w.direction,
      contactName: w.contact.name,
      contactId: w.contactId,
      subject: null,
      preview: w.content.slice(0, 120),
      status: w.status,
      createdAt: w.createdAt,
      aiClassification: null,
      aiSummary: null,
      aiReplied: false,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(unified);
}
