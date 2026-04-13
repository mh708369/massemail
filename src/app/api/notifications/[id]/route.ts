import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT — mark single notification as read
export async function PUT(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notification = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });
  return NextResponse.json(notification);
}

// DELETE — remove notification
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.notification.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
