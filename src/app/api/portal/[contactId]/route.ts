import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public read-only portal data for a contact (no auth — token-based via URL)
export async function GET(_req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const { contactId } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      status: true,
      createdAt: true,
      tickets: {
        select: {
          id: true,
          subject: true,
          status: true,
          priority: true,
          createdAt: true,
          resolvedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      deals: {
        select: {
          id: true,
          title: true,
          value: true,
          stage: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contact);
}
