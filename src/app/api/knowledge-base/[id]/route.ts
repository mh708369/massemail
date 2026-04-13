import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  const article = await prisma.knowledgeBase.update({ where: { id }, data });
  return NextResponse.json(article);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.knowledgeBase.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
