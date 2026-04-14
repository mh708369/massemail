import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const data = await req.json();

    const updateData: Record<string, unknown> = {};
    if (data.period) updateData.period = data.period;
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    if (data.targetAmount !== undefined) updateData.targetAmount = parseFloat(data.targetAmount);
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const target = await prisma.salesTarget.update({ where: { id }, data: updateData });

    logAction({ userId: user.id, action: "sales_target.update", entity: "sales_target", entityId: id, details: { fields: Object.keys(updateData) } }).catch(() => {});

    return NextResponse.json(target);
  } catch (e) {
    console.error("[/api/sales/targets/[id] PUT]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await prisma.salesTarget.delete({ where: { id } });

    logAction({ userId: user.id, action: "sales_target.delete", entity: "sales_target", entityId: id }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[/api/sales/targets/[id] DELETE]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
