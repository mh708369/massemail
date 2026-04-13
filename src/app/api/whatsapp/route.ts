import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, verifyWebhook } from "@/lib/whatsapp";
import { getCurrentUser, isAdmin } from "@/lib/rbac";

// GET /api/whatsapp — list messages or verify webhook
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Meta webhook verification
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode && token && challenge) {
    const result = verifyWebhook(mode, token, challenge);
    if (result.valid) {
      return new Response(result.challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // List messages — scoped to current user unless admin
  const contactId = searchParams.get("contactId");
  const user = await getCurrentUser();
  const where: Record<string, unknown> = {};
  if (contactId) where.contactId = contactId;

  // Non-admins only see WhatsApp messages they sent + unassigned (shared inbound)
  if (user && !isAdmin(user)) {
    where.OR = [{ userId: user.id }, { userId: null }];
  }

  try {
    const messages = await prisma.whatsAppMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { contact: true },
      take: 100,
    });
    return NextResponse.json(messages);
  } catch (e) {
    console.error("[/api/whatsapp GET]", e);
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/whatsapp — send message or receive webhook
export async function POST(req: Request) {
  const body = await req.json();

  // Incoming webhook from Meta
  if (body.object === "whatsapp_business_account") {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages || [];
        for (const msg of messages) {
          const phone = msg.from;
          const content = msg.text?.body || msg.caption || "[media]";

          // Find contact by whatsapp phone
          const contact = await prisma.contact.findFirst({
            where: {
              OR: [
                { whatsappPhone: { contains: phone.slice(-10) } },
                { phone: { contains: phone.slice(-10) } },
              ],
            },
          });

          if (contact) {
            await prisma.whatsAppMessage.create({
              data: {
                direction: "inbound",
                phone,
                content,
                status: "delivered",
                waMessageId: msg.id,
                sentAt: new Date(parseInt(msg.timestamp) * 1000),
                contactId: contact.id,
              },
            });
          }
        }

        // Status updates
        const statuses = change.value?.statuses || [];
        for (const status of statuses) {
          if (status.id) {
            await prisma.whatsAppMessage.updateMany({
              where: { waMessageId: status.id },
              data: { status: status.status },
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  }

  // Outbound: send message — tagged with the current user as sender
  const user = await getCurrentUser();
  const result = await sendWhatsAppMessage({
    phone: body.phone,
    content: body.content,
    contactId: body.contactId,
    templateId: body.templateId,
    followUpExecId: body.followUpExecId,
    senderUserId: user?.id || null,
  });

  return NextResponse.json(result);
}
