import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";

  if (!q) return NextResponse.json({ contacts: [], deals: [], tickets: [], campaigns: [] });

  const [contacts, deals, tickets, campaigns] = await Promise.all([
    prisma.contact.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { company: { contains: q } },
        ],
      },
      take: 5,
      select: { id: true, name: true, email: true, company: true },
    }),
    prisma.deal.findMany({
      where: { title: { contains: q } },
      take: 5,
      select: { id: true, title: true, value: true, stage: true, contact: { select: { name: true } } },
    }),
    prisma.ticket.findMany({
      where: {
        OR: [{ subject: { contains: q } }, { description: { contains: q } }],
      },
      take: 5,
      select: { id: true, subject: true, status: true, priority: true, contact: { select: { name: true } } },
    }),
    prisma.campaign.findMany({
      where: { name: { contains: q } },
      take: 5,
      select: { id: true, name: true, status: true, sentCount: true },
    }),
  ]);

  return NextResponse.json({ contacts, deals, tickets, campaigns });
}
