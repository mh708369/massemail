import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

export async function GET() {
  try {
    const activities = await prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true, contact: true, deal: true },
      take: 50,
    });
    return NextResponse.json(activities);
  } catch (e) {
    console.error("[/api/activities GET]", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();

    // Whitelist fields — prevent mass-assignment
    const activity = await prisma.activity.create({
      data: {
        type: String(body.type || "note"),
        description: String(body.description || ""),
        userId: user.id, // always use authenticated user, never from body
        contactId: body.contactId,
        dealId: body.dealId || null,
      },
      include: { user: true, contact: true, deal: true },
    });
    return NextResponse.json(activity);
  } catch (e) {
    console.error("[/api/activities POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
