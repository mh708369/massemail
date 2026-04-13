import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

/**
 * Bulk operations on contacts.
 * Body: { action: "delete" | "update_status" | "tag" | "assign", ids: string[],
 *         status?: string, tag?: string, ownerId?: string | null }
 *
 * Non-admins can only act on contacts they own (or unassigned ones).
 * Only admins can use the "assign" action.
 */
export async function POST(req: Request) {
  const { action, ids, status, tag, ownerId } = await req.json();
  const user = await getCurrentUser();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No contact IDs provided" }, { status: 400 });
  }

  // Restrict to ids the user actually has access to
  let allowedIds = ids;
  if (user && !isAdmin(user)) {
    const accessible = await prisma.contact.findMany({
      where: {
        id: { in: ids },
        OR: [{ ownerId: user.id }, { ownerId: null }],
      },
      select: { id: true },
    });
    allowedIds = accessible.map((c) => c.id);
  }

  if (allowedIds.length === 0) {
    return NextResponse.json({ error: "No accessible contacts in selection" }, { status: 403 });
  }

  if (action === "delete") {
    const result = await prisma.contact.deleteMany({ where: { id: { in: allowedIds } } });
    return NextResponse.json({ success: true, count: result.count });
  }

  if (action === "update_status" && status) {
    const result = await prisma.contact.updateMany({
      where: { id: { in: allowedIds } },
      data: { status },
    });
    return NextResponse.json({ success: true, count: result.count });
  }

  if (action === "assign") {
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    // ownerId === null is valid (unassign)
    const result = await prisma.contact.updateMany({
      where: { id: { in: allowedIds } },
      data: { ownerId: ownerId ?? null },
    });
    await logAction({
      userId: user.id,
      action: "contact.bulk_assign",
      entity: "contact",
      details: {
        count: result.count,
        ids: allowedIds,
        newOwnerId: ownerId ?? null,
      },
    });
    return NextResponse.json({ success: true, count: result.count });
  }

  if (action === "tag" && tag) {
    const contacts = await prisma.contact.findMany({ where: { id: { in: allowedIds } } });
    let updated = 0;
    for (const c of contacts) {
      const existingTags = c.tags ? c.tags.split(",").map((t) => t.trim()) : [];
      if (!existingTags.includes(tag)) {
        existingTags.push(tag);
        await prisma.contact.update({
          where: { id: c.id },
          data: { tags: existingTags.join(",") },
        });
        updated++;
      }
    }
    return NextResponse.json({ success: true, count: updated });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
