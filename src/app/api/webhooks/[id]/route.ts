import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

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

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "webhook.update", entity: "webhook", entityId: id, details: { name: webhook.name } }).catch(() => {});
  }

  return NextResponse.json(webhook);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const webhook = await prisma.webhook.findUnique({ where: { id }, select: { name: true } });
  await prisma.webhook.delete({ where: { id } });

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "webhook.delete", entity: "webhook", entityId: id, details: { name: webhook?.name } }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
