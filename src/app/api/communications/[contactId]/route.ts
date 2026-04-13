import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const { contactId } = await params;

  const [emails, whatsapps, activities] = await Promise.all([
    prisma.emailMessage.findMany({
      where: { contactId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.whatsAppMessage.findMany({
      where: { contactId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.activity.findMany({
      where: { contactId },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
  ]);

  const timeline = [
    ...emails.map((e) => ({
      id: e.id,
      type: "email" as const,
      direction: e.direction,
      subject: e.subject,
      content: e.body,
      status: e.status,
      createdAt: e.createdAt,
    })),
    ...whatsapps.map((w) => ({
      id: w.id,
      type: "whatsapp" as const,
      direction: w.direction,
      subject: null,
      content: w.content,
      status: w.status,
      createdAt: w.createdAt,
    })),
    ...activities.map((a) => ({
      id: a.id,
      type: "activity" as const,
      direction: null,
      subject: a.type,
      content: a.description,
      status: null,
      createdAt: a.createdAt,
      userName: a.user.name,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(timeline);
}
