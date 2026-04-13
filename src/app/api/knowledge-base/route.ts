import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const articles = await prisma.knowledgeBase.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(articles);
}

export async function POST(req: Request) {
  const data = await req.json();
  const article = await prisma.knowledgeBase.create({ data });
  return NextResponse.json(article);
}
