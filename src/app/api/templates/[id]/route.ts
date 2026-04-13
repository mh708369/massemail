import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  const template = await prisma.messageTemplate.update({ where: { id }, data });
  return NextResponse.json(template);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.messageTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
