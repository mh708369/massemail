import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

/**
 * PUT /api/enterprise/team/[id]/ooo
 * Body: { outOfOffice: boolean, outOfOfficeUntil?: string|null, backupUserId?: string|null }
 *
 * Admin-only. Or self — a user can toggle their own OOO state.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(currentUser) && currentUser.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {
    outOfOffice: body.outOfOffice === true,
  };
  if ("outOfOfficeUntil" in body) {
    data.outOfOfficeUntil = body.outOfOfficeUntil ? new Date(body.outOfOfficeUntil) : null;
  }
  if ("backupUserId" in body) {
    data.backupUserId = body.backupUserId || null;
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: data as never,
      select: { id: true, name: true, email: true } as never,
    });

    await logAction({
      userId: currentUser.id,
      action: body.outOfOffice ? "user.ooo_on" : "user.ooo_off",
      entity: "user",
      entityId: id,
      details: {
        outOfOffice: body.outOfOffice,
        until: body.outOfOfficeUntil || null,
        backup: body.backupUserId || null,
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
