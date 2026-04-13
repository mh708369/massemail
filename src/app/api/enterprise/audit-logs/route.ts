import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity");
  const action = searchParams.get("action");
  const userId = searchParams.get("userId");

  const where: Record<string, unknown> = {};
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (userId) where.userId = userId;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
    take: 200,
  });
  return NextResponse.json(logs);
}
