import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, parseTemplate } from "@/lib/email";
import { getCurrentUser } from "@/lib/rbac";

export async function POST(req: Request) {
  const { contactIds, subject, body, templateId, filter, autoFollowUp } = await req.json();
  const user = await getCurrentUser();
  const senderUserId = user?.id || null;

  // Resolve target contacts
  let targetIds: string[] = contactIds || [];

  // If a filter is given, resolve contacts based on it
  if (!targetIds.length && filter) {
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.source) where.source = filter.source;
    if (filter.tag) where.tags = { contains: filter.tag };

    const contacts = await prisma.contact.findMany({
      where,
      select: { id: true },
    });
    targetIds = contacts.map((c) => c.id);
  }

  if (!targetIds.length) {
    return NextResponse.json({ error: "No contacts selected" }, { status: 400 });
  }

  // Optionally pull subject/body from a template
  let finalSubject = subject;
  let finalBody = body;
  if (templateId) {
    const tmpl = await prisma.messageTemplate.findUnique({ where: { id: templateId } });
    if (tmpl) {
      finalSubject = tmpl.subject || subject;
      finalBody = tmpl.body || body;
    }
  }

  if (!finalSubject || !finalBody) {
    return NextResponse.json({ error: "Subject and body required" }, { status: 400 });
  }

  // Fetch contacts and send sequentially with personalization
  const contacts = await prisma.contact.findMany({
    where: { id: { in: targetIds } },
  });

  const results = {
    total: contacts.length,
    sent: 0,
    failed: 0,
    failures: [] as { contactId: string; email: string; error?: string }[],
  };

  for (const contact of contacts) {
    const variables = {
      name: contact.name,
      email: contact.email,
      company: contact.company || "your business",
    };

    const personalizedSubject = parseTemplate(finalSubject, variables);
    const personalizedBody = parseTemplate(finalBody, variables);

    const result = await sendEmail({
      to: contact.email,
      subject: personalizedSubject,
      body: personalizedBody,
      contactId: contact.id,
      templateId,
      autoFollowUp: autoFollowUp ?? true,
      senderUserId,
    });

    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.failures.push({
        contactId: contact.id,
        email: contact.email,
        error: result.error,
      });
    }
  }

  return NextResponse.json(results);
}
