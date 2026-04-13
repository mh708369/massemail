import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

/**
 * Read just the ownerId for a contact via raw SQL — works regardless of
 * whether the Prisma client knows about the column yet.
 */
async function getContactOwnerId(contactId: string): Promise<string | null | undefined> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ ownerId: string | null }>>(
      `SELECT ownerId FROM "Contact" WHERE id = ? LIMIT 1`,
      contactId
    );
    if (rows.length === 0) return undefined;
    return rows[0].ownerId;
  } catch {
    return undefined;
  }
}

/**
 * Non-admin users can only see/modify contacts they own (or unassigned contacts).
 * Admins have full access.
 */
async function userCanAccess(contactId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  if (isAdmin(user)) return true;
  const ownerId = await getContactOwnerId(contactId);
  if (ownerId === undefined) return false;
  return ownerId === user.id || ownerId === null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await userCanAccess(id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        deals: true,
        tickets: true,
        activities: { include: { user: true }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // ownerId via raw SQL (the typed result may strip the column on a stale client)
    const ownerId = await getContactOwnerId(id);
    const owner =
      ownerId
        ? await prisma.user.findUnique({
            where: { id: ownerId },
            select: { id: true, name: true, email: true },
          })
        : null;

    return NextResponse.json({ ...contact, ownerId: ownerId ?? null, owner });
  } catch (e) {
    console.error("[/api/contacts/[id] GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await userCanAccess(id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const data = await req.json();
    const user = await getCurrentUser();

    // Extract ownerId — patch it via raw SQL after the typed update
    let newOwnerId: string | null | undefined = undefined;
    if ("ownerId" in data) {
      if (user && !isAdmin(user)) {
        // Non-admins cannot reassign ownership
        delete data.ownerId;
      } else {
        newOwnerId = data.ownerId ?? null;
        delete data.ownerId; // remove from typed update
      }
    }

    // Track previous owner for audit logging
    let prevOwnerId: string | null | undefined;
    if (newOwnerId !== undefined) {
      prevOwnerId = await getContactOwnerId(id);
    }

    // Whitelist updatable fields so unknown form fields don't crash Prisma
    const updateData: Record<string, unknown> = {};
    const updatableFields = [
      "name",
      "email",
      "phone",
      "whatsappPhone",
      "company",
      "status",
      "preferredChannel",
      "leadScore",
      "source",
      "tags",
      "notes",
    ];
    for (const f of updatableFields) {
      if (f in data) updateData[f] = data[f];
    }

    let contact;
    if (Object.keys(updateData).length > 0) {
      contact = await prisma.contact.update({
        where: { id },
        data: updateData,
      });
    } else {
      contact = await prisma.contact.findUnique({ where: { id } });
      if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Patch ownerId via raw SQL if it changed
    if (newOwnerId !== undefined) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "Contact" SET "ownerId" = ? WHERE id = ?`,
          newOwnerId,
          id
        );
      } catch (e) {
        console.error("[/api/contacts/[id] PUT] raw ownerId patch failed:", e);
      }
    }

    // Resolve final ownerId for the response
    const finalOwnerId = newOwnerId !== undefined ? newOwnerId : await getContactOwnerId(id);
    const owner = finalOwnerId
      ? await prisma.user.findUnique({
          where: { id: finalOwnerId },
          select: { id: true, name: true, email: true },
        })
      : null;

    // Audit-log ownership change
    if (user && newOwnerId !== undefined && prevOwnerId !== newOwnerId) {
      await logAction({
        userId: user.id,
        action: "contact.reassign",
        entity: "contact",
        entityId: id,
        details: {
          from: prevOwnerId ?? null,
          to: newOwnerId,
          contactName: (contact as { name?: string }).name,
          contactEmail: (contact as { email?: string }).email,
        },
      });
    }

    return NextResponse.json({ ...contact, ownerId: finalOwnerId ?? null, owner });
  } catch (e) {
    console.error("[/api/contacts/[id] PUT]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await userCanAccess(id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[/api/contacts/[id] DELETE]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
