import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  const article = await prisma.knowledgeBase.update({ where: { id }, data });

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "kb.update", entity: "knowledge_base", entityId: id, details: { question: article.question } }).catch(() => {});
  }

  return NextResponse.json(article);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await prisma.knowledgeBase.findUnique({ where: { id }, select: { question: true } });
  await prisma.knowledgeBase.delete({ where: { id } });

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "kb.delete", entity: "knowledge_base", entityId: id, details: { question: article?.question } }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
