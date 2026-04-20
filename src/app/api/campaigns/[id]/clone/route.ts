import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const original = await prisma.campaign.findUnique({ where: { id } });
  if (!original) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const clone = await prisma.campaign.create({
    data: {
      name: `${original.name} (Copy)`,
      subject: original.subject,
      content: original.content,
      type: original.type,
      status: "draft",
      subjectB: original.subjectB,
      abTestEnabled: original.abTestEnabled,
    },
  });

  logAction({ userId: user.id, action: "campaign.clone", entity: "campaign", entityId: clone.id, details: { clonedFrom: id, name: clone.name } }).catch(() => {});

  return NextResponse.json(clone);
}
