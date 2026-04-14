import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  const campaign = await prisma.campaign.update({ where: { id }, data });

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "campaign.update", entity: "campaign", entityId: id, details: { name: campaign.name, fields: Object.keys(data) } }).catch(() => {});
  }

  return NextResponse.json(campaign);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { name: true } });
  await prisma.campaign.delete({ where: { id } });

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "campaign.delete", entity: "campaign", entityId: id, details: { name: campaign?.name } }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
