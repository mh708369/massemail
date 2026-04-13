import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope"); // "all" | "mine"

  const user = await getCurrentUser();

  // Non-admins only see tickets assigned to them or unassigned
  const where: Record<string, unknown> = {};
  if ((scope === "mine" || (user && !isAdmin(user))) && user) {
    where.OR = [{ assignedToId: user.id }, { assignedToId: null }];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { contact: true, assignedTo: true },
  });
  return NextResponse.json(tickets);
}

export async function POST(req: Request) {
  const data = await req.json();
  const ticket = await prisma.ticket.create({ data, include: { contact: true } });
  return NextResponse.json(ticket);
}
