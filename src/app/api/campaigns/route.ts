import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaigns = await prisma.campaign.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(campaigns);
}

export async function POST(req: Request) {
  const data = await req.json();
  const campaign = await prisma.campaign.create({ data });

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "campaign.create", entity: "campaign", entityId: campaign.id, details: { name: data.name, type: data.type } }).catch(() => {});
  }

  return NextResponse.json(campaign);
}
