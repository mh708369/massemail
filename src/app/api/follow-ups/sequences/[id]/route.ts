import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sequence = await prisma.followUpSequence.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { stepOrder: "asc" }, include: { template: true } },
      executions: { include: { contact: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!sequence) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sequence);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, description, isActive, triggerEvent, steps } = await req.json();

  // Update sequence and replace steps
  if (steps) {
    await prisma.followUpStep.deleteMany({ where: { sequenceId: id } });
    await prisma.followUpStep.createMany({
      data: steps.map((s: { channel: string; subject?: string; body?: string; delayMinutes: number; templateId?: string }, i: number) => ({
        sequenceId: id,
        stepOrder: i,
        channel: s.channel || "email",
        subject: s.subject || null,
        body: s.body || null,
        delayMinutes: s.delayMinutes || 1440,
        templateId: s.templateId || null,
      })),
    });
  }

  const sequence = await prisma.followUpSequence.update({
    where: { id },
    data: { name, description, isActive, triggerEvent },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  return NextResponse.json(sequence);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.followUpSequence.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
