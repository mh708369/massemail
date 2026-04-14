import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function GET() {
  const articles = await prisma.knowledgeBase.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(articles);
}

export async function POST(req: Request) {
  const data = await req.json();
  const article = await prisma.knowledgeBase.create({ data });

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "kb.create", entity: "knowledge_base", entityId: article.id, details: { question: data.question, category: data.category } }).catch(() => {});
  }

  return NextResponse.json(article);
}
