import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();

  // If marking done, set completedAt
  if (data.done === true) {
    data.completedAt = new Date();
  } else if (data.done === false) {
    data.completedAt = null;
  }

  if (data.dueDate) data.dueDate = new Date(data.dueDate);

  const task = await prisma.task.update({ where: { id }, data });

  const user = await getCurrentUser();
  if (user) {
    const action = data.done === true ? "task.complete" : data.done === false ? "task.reopen" : "task.update";
    logAction({ userId: user.id, action, entity: "task", entityId: id, details: { title: task.title } }).catch(() => {});
  }

  return NextResponse.json(task);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id }, select: { title: true } });
  await prisma.task.delete({ where: { id } });

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "task.delete", entity: "task", entityId: id, details: { title: task?.title } }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
