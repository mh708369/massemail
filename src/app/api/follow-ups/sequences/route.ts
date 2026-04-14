import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function GET() {
  const sequences = await prisma.followUpSequence.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      steps: { orderBy: { stepOrder: "asc" }, include: { template: true } },
      _count: { select: { executions: true } },
    },
  });
  return NextResponse.json(sequences);
}

export async function POST(req: Request) {
  const { name, description, triggerEvent, steps } = await req.json();

  const sequence = await prisma.followUpSequence.create({
    data: {
      name,
      description,
      triggerEvent,
      steps: {
        create: (steps || []).map((s: { channel: string; subject?: string; body?: string; delayMinutes: number; templateId?: string }, i: number) => ({
          stepOrder: i,
          channel: s.channel || "email",
          subject: s.subject || null,
          body: s.body || null,
          delayMinutes: s.delayMinutes || 1440,
          templateId: s.templateId || null,
        })),
      },
    },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "followup.create", entity: "follow_up", entityId: sequence.id, details: { name, triggerEvent, stepsCount: steps?.length || 0 } }).catch(() => {});
  }

  return NextResponse.json(sequence);
}
