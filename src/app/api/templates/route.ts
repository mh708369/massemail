import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const templates = await prisma.messageTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const data = await req.json();
  const template = await prisma.messageTemplate.create({ data });

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "template.create", entity: "template", entityId: template.id, details: { name: data.name, type: data.type } }).catch(() => {});
  }

  return NextResponse.json(template);
}
