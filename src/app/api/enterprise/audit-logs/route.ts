import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity");
  const action = searchParams.get("action");
  const userId = searchParams.get("userId");
  const search = searchParams.get("search");
  const limit = Math.min(parseInt(searchParams.get("limit") || "500"), 1000);

  const where: Record<string, unknown> = {};
  if (entity) where.entity = entity;
  if (action) where.action = { contains: action };
  if (userId) where.userId = userId;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
    take: limit,
  });

  // Client-side search filter for details/action text
  let filtered = logs;
  if (search) {
    const s = search.toLowerCase();
    filtered = logs.filter(
      (l) =>
        l.action.toLowerCase().includes(s) ||
        l.entity.toLowerCase().includes(s) ||
        (l.details && l.details.toLowerCase().includes(s)) ||
        l.user.name.toLowerCase().includes(s) ||
        l.user.email.toLowerCase().includes(s)
    );
  }

  // Also return distinct values for filter dropdowns
  const allEntities = [...new Set(logs.map((l) => l.entity))].sort();
  const allActions = [...new Set(logs.map((l) => l.action))].sort();
  const allUsers = [...new Map(logs.map((l) => [l.userId, { id: l.userId, name: l.user.name, email: l.user.email }])).values()];

  return NextResponse.json({
    logs: filtered,
    meta: { total: filtered.length, entities: allEntities, actions: allActions, users: allUsers },
  });
}
