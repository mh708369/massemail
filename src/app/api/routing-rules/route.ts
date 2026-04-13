import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

const client = () =>
  (prisma as unknown as {
    leadRoutingRule: {
      findMany: (args?: unknown) => Promise<unknown[]>;
      create: (args: unknown) => Promise<{ id: string }>;
    };
  }).leadRoutingRule;

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return NextResponse.json([], { status: 403 });
  try {
    const rules = await client().findMany({
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(rules);
  } catch (e) {
    console.error("[/api/routing-rules GET]", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const data = await req.json();
  if (!data.name || !data.assignToUserId) {
    return NextResponse.json({ error: "name and assignToUserId required" }, { status: 400 });
  }
  try {
    const rule = await client().create({
      data: {
        name: data.name,
        sourcePattern: data.sourcePattern || null,
        domainPattern: data.domainPattern || null,
        tagPattern: data.tagPattern || null,
        assignToUserId: data.assignToUserId,
        isActive: data.isActive ?? true,
        priority: typeof data.priority === "number" ? data.priority : 100,
      },
    });
    await logAction({
      userId: user.id,
      action: "routing_rule.create",
      entity: "routing_rule",
      entityId: rule.id,
      details: { name: data.name, assignToUserId: data.assignToUserId },
    });
    return NextResponse.json(rule);
  } catch (e) {
    console.error("[/api/routing-rules POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
