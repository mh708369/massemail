import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.trigger !== undefined) updateData.trigger = data.trigger;
  if (data.conditions !== undefined) updateData.conditions = JSON.stringify(data.conditions);
  if (data.actions !== undefined) updateData.actions = JSON.stringify(data.actions);

  const workflow = await prisma.workflow.update({ where: { id }, data: updateData });
  return NextResponse.json(workflow);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.workflow.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
