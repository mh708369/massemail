import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

const client = () =>
  (prisma as unknown as {
    leadRoutingRule: {
      update: (args: unknown) => Promise<{ id: string }>;
      delete: (args: unknown) => Promise<{ id: string }>;
    };
  }).leadRoutingRule;

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const data = await req.json();
  try {
    const rule = await client().update({
      where: { id },
      data: {
        name: data.name,
        sourcePattern: data.sourcePattern || null,
        domainPattern: data.domainPattern || null,
        tagPattern: data.tagPattern || null,
        assignToUserId: data.assignToUserId,
        isActive: data.isActive,
        priority: data.priority,
      },
    });
    await logAction({
      userId: user.id,
      action: "routing_rule.update",
      entity: "routing_rule",
      entityId: id,
    });
    return NextResponse.json(rule);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    await client().delete({ where: { id } });
    await logAction({
      userId: user.id,
      action: "routing_rule.delete",
      entity: "routing_rule",
      entityId: id,
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
