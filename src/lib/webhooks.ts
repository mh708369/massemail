import { prisma } from "./prisma";
import crypto from "node:crypto";

/**
 * Fire all webhooks subscribed to an event.
 * Sends POST with HMAC signature using the webhook secret.
 */
export async function fireWebhook(event: string, payload: Record<string, unknown>) {
  const webhooks = await prisma.webhook.findMany({ where: { isActive: true } });
  const matching = webhooks.filter((w) => w.events.split(",").map((e) => e.trim()).includes(event));

  await Promise.all(
    matching.map(async (w) => {
      try {
        const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
        const signature = w.secret
          ? crypto.createHmac("sha256", w.secret).update(body).digest("hex")
          : "";

        const res = await fetch(w.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Synergific-Event": event,
            "X-Synergific-Signature": signature,
          },
          body,
        });

        if (res.ok) {
          await prisma.webhook.update({
            where: { id: w.id },
            data: { lastFiredAt: new Date(), failureCount: 0 },
          });
        } else {
          await prisma.webhook.update({
            where: { id: w.id },
            data: { failureCount: { increment: 1 }, lastFiredAt: new Date() },
          });
        }
      } catch (err) {
        console.error(`[webhook] Failed to fire ${event} to ${w.url}:`, err);
        try {
          await prisma.webhook.update({
            where: { id: w.id },
            data: { failureCount: { increment: 1 } },
          });
        } catch {}
      }
    })
  );
}
