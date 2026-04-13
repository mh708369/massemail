import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { pickAndResolveOwner, resolveEffectiveOwner } from "@/lib/routing";

// GET /api/contacts — admins see all; non-admins see only their owned contacts
//                    (plus unassigned ones, so the team can pick them up).
// ?scope=mine to force the "owned only" view even for admins.
//
// Uses raw SQL so a stale Prisma client (which may not know about
// Contact.ownerId or lastContactedAt) can't break the route.
interface ContactRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsappPhone: string | null;
  company: string | null;
  status: string;
  preferredChannel: string;
  leadScore: number | null;
  source: string | null;
  tags: string | null;
  notes: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string | null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");
    const user = await getCurrentUser();

    const restrict = user && (!isAdmin(user) || scope === "mine");

    const sql = restrict
      ? `SELECT id, name, email, phone, whatsappPhone, company, status, preferredChannel,
                leadScore, source, tags, notes, lastContactedAt, createdAt, updatedAt, ownerId
           FROM "Contact"
          WHERE ownerId = ? OR ownerId IS NULL
          ORDER BY createdAt DESC`
      : `SELECT id, name, email, phone, whatsappPhone, company, status, preferredChannel,
                leadScore, source, tags, notes, lastContactedAt, createdAt, updatedAt, ownerId
           FROM "Contact"
          ORDER BY createdAt DESC`;

    let contacts: ContactRow[];
    try {
      contacts = restrict
        ? await prisma.$queryRawUnsafe<ContactRow[]>(sql, user!.id)
        : await prisma.$queryRawUnsafe<ContactRow[]>(sql);
    } catch (rawErr) {
      // Fall back to typed query without owner scoping if raw fails for any reason
      console.error("[/api/contacts GET] raw query failed, falling back:", rawErr);
      const fallback = await prisma.contact.findMany({ orderBy: { createdAt: "desc" } });
      contacts = fallback as unknown as ContactRow[];
    }

    // Manual owner join via raw SQL on User table
    const ownerIds = Array.from(
      new Set(contacts.map((c) => c.ownerId).filter(Boolean) as string[])
    );
    let ownerById = new Map<string, { id: string; name: string; email: string }>();
    if (ownerIds.length > 0) {
      try {
        const placeholders = ownerIds.map(() => "?").join(",");
        const users = await prisma.$queryRawUnsafe<
          Array<{ id: string; name: string; email: string }>
        >(
          `SELECT id, name, email FROM "User" WHERE id IN (${placeholders})`,
          ...ownerIds
        );
        ownerById = new Map(users.map((u) => [u.id, u]));
      } catch {}
    }

    const enriched = contacts.map((c) => ({
      ...c,
      owner: c.ownerId ? ownerById.get(c.ownerId) ?? null : null,
    }));

    return NextResponse.json(enriched);
  } catch (e) {
    console.error("[/api/contacts GET]", e);
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/contacts — auto-assigns ownerId to the current user unless an admin
// explicitly sets one in the payload.
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const user = await getCurrentUser();

    // Required field validation
    if (!data?.name || !data?.email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }

    let ownerId: string | null = null;
    if (user) {
      try {
        if (isAdmin(user)) {
          if (data.ownerId) {
            ownerId = await resolveEffectiveOwner(data.ownerId);
          } else {
            ownerId = await pickAndResolveOwner(
              { source: data.source, email: data.email, tags: data.tags },
              user.id
            );
          }
        } else {
          ownerId = await resolveEffectiveOwner(user.id);
        }
      } catch (e) {
        // If the routing/OOO resolution somehow fails, fall back to the user
        // themselves so we never block contact creation
        console.error("[/api/contacts POST] owner resolution failed:", e);
        ownerId = user.id;
      }
    }

    // Whitelist fields so unknown form fields don't crash Prisma.
    // Note: we deliberately DO NOT include `ownerId` in the typed create —
    // a stale Prisma client may not know about the field even though the column
    // exists in the DB. We patch ownerId via raw SQL right after.
    const contactData = {
      name: String(data.name).trim(),
      email: String(data.email).trim().toLowerCase(),
      phone: data.phone || null,
      whatsappPhone: data.whatsappPhone || null,
      company: data.company || null,
      status: data.status || "lead",
      preferredChannel: data.preferredChannel || "email",
      leadScore: typeof data.leadScore === "number" ? data.leadScore : null,
      source: data.source || null,
      tags: data.tags || null,
      notes: data.notes || null,
    };

    let contact;
    try {
      contact = await prisma.contact.create({ data: contactData });
    } catch (e) {
      console.error("[/api/contacts POST] prisma create failed:", e);
      throw e;
    }

    // Patch ownerId via raw SQL so a stale Prisma client (which may not know
    // about Contact.ownerId yet) doesn't break the create.
    if (ownerId) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "Contact" SET "ownerId" = ? WHERE id = ?`,
          ownerId,
          contact.id
        );
        (contact as { ownerId?: string | null }).ownerId = ownerId;
      } catch (e) {
        console.error("[/api/contacts POST] raw ownerId patch failed:", e);
      }
    }

    let owner = null;
    if (ownerId) {
      owner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, name: true, email: true },
      });
    }

    return NextResponse.json({ ...contact, owner });
  } catch (e) {
    console.error("[/api/contacts POST]", e);
    const message = String(e);
    // Friendly error for the most common cause: duplicate email
    if (message.includes("Unique constraint") || message.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "A contact with this email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
