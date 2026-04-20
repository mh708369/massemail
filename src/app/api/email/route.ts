import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, sendBulkEmail } from "@/lib/email";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

// GET /api/email — list emails (inbox)
// Uses raw SQL scoping for userId so a stale Prisma client can't break it.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const direction = searchParams.get("direction");
    const contactId = searchParams.get("contactId");
    const scope = searchParams.get("scope");

    const user = await getCurrentUser();

    // Build WHERE conditions + params for raw SQL
    const clauses: string[] = ["1 = 1"];
    const params: unknown[] = [];

    if (direction) {
      clauses.push(`e.direction = ?`);
      params.push(direction);
    }
    if (contactId) {
      clauses.push(`e.contactId = ?`);
      params.push(contactId);
    }
    if (user && (!isAdmin(user) || scope === "mine")) {
      clauses.push(`(e.userId = ? OR e.userId IS NULL)`);
      params.push(user.id);
    }

    const sql = `
      SELECT e.*, c.name AS contactName, c.email AS contactEmail
        FROM "EmailMessage" e
        LEFT JOIN "Contact" c ON e.contactId = c.id
       WHERE ${clauses.join(" AND ")}
       ORDER BY e.createdAt DESC
       LIMIT 500`;

    const rows = await prisma.$queryRawUnsafe<
      Array<Record<string, unknown>>
    >(sql, ...params);

    // Reshape the contact join into a nested object to match the old response shape
    const emails = rows.map((r) => ({
      ...r,
      contact: r.contactName ? { id: r.contactId, name: r.contactName, email: r.contactEmail } : null,
    }));

    return NextResponse.json(emails);
  } catch (e) {
    console.error("[/api/email GET]", e);
    // Fall back to unscoped typed query
    try {
      const emails = await prisma.emailMessage.findMany({
        orderBy: { createdAt: "desc" },
        include: { contact: true },
        take: 500,
      });
      return NextResponse.json(emails);
    } catch {
      return NextResponse.json([], { status: 200 });
    }
  }
}

/**
 * POST /api/email — send email with optional file attachments.
 *
 * Accepts two content types:
 *   - application/json (existing callers — no attachments)
 *   - multipart/form-data (new — files in "files" field, other fields as form values)
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const senderUserId = user?.id || null;
  const contentType = req.headers.get("content-type") || "";

  let body: Record<string, unknown>;
  let attachments: import("@/lib/email").EmailAttachment[] | undefined;

  if (contentType.includes("multipart/form-data")) {
    // Parse multipart — files + form fields
    const formData = await req.formData();
    body = {
      to: formData.get("to") as string,
      subject: formData.get("subject") as string,
      body: formData.get("body") as string,
      contactId: formData.get("contactId") as string,
      templateId: formData.get("templateId") as string || undefined,
      autoFollowUp: formData.get("autoFollowUp") !== "false",
      bulk: formData.get("bulk") === "true",
      contactIds: formData.get("contactIds")
        ? JSON.parse(formData.get("contactIds") as string)
        : undefined,
    };

    // Process file attachments
    const files = formData.getAll("files") as File[];
    if (files.length > 0) {
      attachments = [];
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { error: `File "${file.name}" exceeds 10 MB limit` },
            { status: 400 }
          );
        }
        const buffer = await file.arrayBuffer();
        attachments.push({
          name: file.name,
          contentType: file.type || "application/octet-stream",
          contentBytes: Buffer.from(buffer).toString("base64"),
          size: file.size,
        });
      }
    }
  } else {
    body = await req.json();
  }

  // Bulk send (attachments not supported in bulk — too heavy)
  if (body.bulk && body.contactIds) {
    const results = await sendBulkEmail({
      contactIds: body.contactIds as string[],
      subject: body.subject as string,
      body: body.body as string,
      templateId: body.templateId as string | undefined,
      senderUserId,
    });

    if (user) {
      logAction({ userId: user.id, action: "email.bulk_send", entity: "email", details: { subject: body.subject, recipientCount: (body.contactIds as string[]).length } }).catch(() => {});
    }

    return NextResponse.json({ results });
  }

  // Single send with optional attachments
  const result = await sendEmail({
    to: body.to as string,
    subject: body.subject as string,
    body: body.body as string,
    contactId: body.contactId as string,
    replyTo: body.replyTo as string | undefined,
    inReplyTo: body.inReplyTo as string | undefined,
    templateId: body.templateId as string | undefined,
    followUpExecId: body.followUpExecId as string | undefined,
    autoFollowUp: (body.autoFollowUp as boolean) ?? true,
    senderUserId,
    attachments,
  });

  if (user) {
    logAction({ userId: user.id, action: "email.send", entity: "email", entityId: result?.id, details: { to: body.to, subject: body.subject, hasAttachments: !!attachments?.length } }).catch(() => {});
  }

  return NextResponse.json(result);
}
