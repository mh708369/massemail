import { prisma } from "./prisma";

const WHATSAPP_API = "https://graph.facebook.com/v21.0";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export async function sendWhatsAppMessage({
  phone,
  content,
  contactId,
  templateId,
  followUpExecId,
  senderUserId,
}: {
  phone: string;
  content: string;
  contactId: string;
  templateId?: string;
  followUpExecId?: string;
  senderUserId?: string | null;
}) {
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  try {
    const res = await fetch(`${WHATSAPP_API}/${phoneId}/messages`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace(/[^0-9]/g, ""),
        type: "text",
        text: { body: content },
      }),
    });

    const data = await res.json();

    const waMessageId = data.messages?.[0]?.id || null;
    const status = res.ok ? "sent" : "failed";

    const record = await prisma.whatsAppMessage.create({
      data: {
        direction: "outbound",
        phone,
        content,
        status,
        waMessageId,
        sentAt: new Date(),
        contactId,
        userId: senderUserId || null,
        templateId: templateId || null,
        followUpExecId: followUpExecId || null,
      } as never, // userId added in migration; cast in case Prisma client is stale
    });

    if (res.ok) {
      await prisma.contact.update({
        where: { id: contactId },
        data: { lastContactedAt: new Date() },
      });
    }

    return { success: res.ok, waMessageId, messageId: record.id };
  } catch (error) {
    await prisma.whatsAppMessage.create({
      data: {
        direction: "outbound",
        phone,
        content,
        status: "failed",
        contactId,
        userId: senderUserId || null,
        templateId: templateId || null,
        followUpExecId: followUpExecId || null,
      } as never,
    });

    return { success: false, error: String(error) };
  }
}

export async function sendWhatsAppTemplate({
  phone,
  templateName,
  languageCode,
  parameters,
  contactId,
}: {
  phone: string;
  templateName: string;
  languageCode?: string;
  parameters?: string[];
  contactId: string;
}) {
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  const components = parameters?.length
    ? [{ type: "body", parameters: parameters.map((p) => ({ type: "text", text: p })) }]
    : undefined;

  const res = await fetch(`${WHATSAPP_API}/${phoneId}/messages`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone.replace(/[^0-9]/g, ""),
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode || "en_US" },
        ...(components ? { components } : {}),
      },
    }),
  });

  const data = await res.json();
  return { success: res.ok, data };
}

export function verifyWebhook(mode: string, token: string, challenge: string) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && token === verifyToken) {
    return { valid: true, challenge };
  }
  return { valid: false };
}
