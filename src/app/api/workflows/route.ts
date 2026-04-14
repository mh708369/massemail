import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json([], { status: 403 });

  const workflows = await prisma.workflow.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(workflows);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const data = await req.json();
  const workflow = await prisma.workflow.create({
    data: {
      name: data.name,
      description: data.description || null,
      trigger: data.trigger,
      conditions: data.conditions ? JSON.stringify(data.conditions) : null,
      actions: data.actions ? JSON.stringify(data.actions) : null,
      isActive: data.isActive ?? true,
    },
  });

  logAction({ userId: user!.id, action: "workflow.create", entity: "workflow", entityId: workflow.id, details: { name: data.name, trigger: data.trigger } }).catch(() => {});

  return NextResponse.json(workflow);
}
