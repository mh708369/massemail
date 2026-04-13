import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // "all" | "open" | "done"

  const user = await getCurrentUser();
  if (!user) return NextResponse.json([]);

  const where: Record<string, unknown> = { userId: user.id };
  if (status === "open") where.done = false;
  if (status === "done") where.done = true;

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ done: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const data = await req.json();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      priority: data.priority || "medium",
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      contactId: data.contactId || null,
      dealId: data.dealId || null,
      ticketId: data.ticketId || null,
      userId: user.id,
    },
  });

  return NextResponse.json(task);
}
