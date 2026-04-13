import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  return NextResponse.json(task);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
