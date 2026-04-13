import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const { id } = await params;
    const data = await req.json();
    const updateData: Record<string, unknown> = {};
    if (typeof data.role === "string") updateData.role = data.role;
    if (typeof data.isActive === "boolean") updateData.isActive = data.isActive;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    return NextResponse.json(user);
  } catch (e) {
    console.error("[/api/enterprise/team/[id] PUT]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
