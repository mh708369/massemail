import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  const template = await prisma.messageTemplate.update({ where: { id }, data });

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "template.update", entity: "template", entityId: id, details: { name: template.name } }).catch(() => {});
  }

  return NextResponse.json(template);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await prisma.messageTemplate.findUnique({ where: { id }, select: { name: true } });
  await prisma.messageTemplate.delete({ where: { id } });

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "template.delete", entity: "template", entityId: id, details: { name: template?.name } }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
