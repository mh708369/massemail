import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, scopeFilter } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get("ownerId");
    const stage = searchParams.get("stage");
    const scope = searchParams.get("scope");
    const user = await getCurrentUser();

    const where: Record<string, unknown> = {};
    if (scope === "mine" || (user && user.role !== "admin")) {
      Object.assign(where, scopeFilter(user, "ownerId"));
    }
    if (ownerId) where.ownerId = ownerId;
    if (stage) where.stage = stage;

    const deals = await prisma.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        contact: true,
        owner: { select: { id: true, name: true, email: true } },
        campaign: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(deals);
  } catch (e) {
    console.error("[/api/deals GET]", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ownerId = data.ownerId || user.id;

    const deal = await prisma.deal.create({
      data: {
        title: data.title,
        value: parseFloat(data.value) || 0,
        stage: data.stage || "lead",
        probability: data.probability || 10,
        contactId: data.contactId,
        ownerId,
        campaignId: data.campaignId || null,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
        notes: data.notes || null,
        source: data.source || "manual",
      },
      include: { contact: true, owner: true, campaign: true },
    });

    logAction({
      userId: user.id,
      action: "deal.create",
      entity: "deal",
      entityId: deal.id,
      details: { title: data.title, value: deal.value, stage: deal.stage, contactId: data.contactId },
    }).catch(() => {});

    return NextResponse.json(deal);
  } catch (e) {
    console.error("[/api/deals POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
