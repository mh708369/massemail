import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickAndResolveOwner } from "@/lib/routing";

/**
 * POST /api/public/leads
 *
 * Public, unauthenticated lead intake. Designed to be called from a public
 * website form (e.g., synergificsoftware.com contact form). Returns CORS
 * headers so it works from any origin.
 *
 * Body: { name, email, phone?, company?, message?, source?, tags? }
 *
 * Behavior:
 *   - Validates required fields (name + email)
 *   - Dedupes by email (returns existing contact's id if already there)
 *   - Applies LeadRoutingRule to pick the owner (falls back to round-robin
 *     across the first active admin)
 *   - Resolves OOO to backup user
 *   - Creates an Activity entry
 *   - Notifies the assigned owner
 *   - Returns { success: true, contactId, status: "created" | "duplicate" }
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = body.phone ? String(body.phone).trim() : null;
  const company = body.company ? String(body.company).trim() : null;
  const message = body.message ? String(body.message).trim() : null;
  const source = body.source ? String(body.source).trim() : "Public form";
  const tags = body.tags ? String(body.tags).trim() : null;

  if (!name || !email) {
    return NextResponse.json(
      { error: "name and email are required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Invalid email" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    // Dedup by email
    const existing = await prisma.contact.findUnique({ where: { email } });
    if (existing) {
      // Append a note about the new submission
      const noteAddition = `\n\n[Public form ${new Date().toISOString().slice(0, 10)}] ${message || "(no message)"}`;
      await prisma.contact.update({
        where: { id: existing.id },
        data: {
          notes: ((existing.notes || "") + noteAddition).slice(0, 4000),
        },
      });
      return NextResponse.json(
        { success: true, contactId: existing.id, status: "duplicate" },
        { headers: CORS_HEADERS }
      );
    }

    // Resolve owner: routing rule → fallback to first active admin → OOO resolve
    const firstAdmin = await prisma.user.findFirst({
      where: { role: "admin", isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    const ownerId = await pickAndResolveOwner(
      { source, email, tags },
      firstAdmin?.id ?? null
    );

    const contact = await prisma.contact.create({
      data: {
        name,
        email,
        phone,
        company,
        status: "lead",
        source,
        tags,
        notes: message,
        ownerId,
      } as never,
    });

    // Activity entry
    if (ownerId) {
      try {
        await prisma.activity.create({
          data: {
            type: "lead_captured",
            description: `Captured from public form (${source})`,
            userId: ownerId,
            contactId: contact.id,
          },
        });
      } catch {}
    }

    // Notify owner
    if (ownerId) {
      try {
        await prisma.notification.create({
          data: {
            userId: ownerId,
            type: "new_lead",
            title: "New lead from public form",
            message: `${name}${company ? ` (${company})` : ""} just filled out the contact form.`,
            link: `/contacts/${contact.id}`,
          },
        });
      } catch {}
    }

    return NextResponse.json(
      { success: true, contactId: contact.id, status: "created" },
      { headers: CORS_HEADERS }
    );
  } catch (e) {
    console.error("[/api/public/leads POST]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
