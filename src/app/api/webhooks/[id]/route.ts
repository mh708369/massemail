import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  const webhook = await prisma.webhook.update({
    where: { id },
    data: {
      isActive: data.isActive,
      ...(data.name && { name: data.name }),
      ...(data.url && { url: data.url }),
      ...(data.events && { events: Array.isArray(data.events) ? data.events.join(",") : data.events }),
    },
  });
  return NextResponse.json(webhook);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.webhook.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
