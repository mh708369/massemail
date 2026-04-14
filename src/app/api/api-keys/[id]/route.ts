import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiKey = await prisma.apiKey.findUnique({ where: { id }, select: { name: true } });
  await prisma.apiKey.delete({ where: { id } });

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "api_key.delete", entity: "api_key", entityId: id, details: { name: apiKey?.name } }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
