import { prisma } from "./prisma";
import {
  getSendingContext,
  getSharedMailboxAppToken,
  getValidAccessToken,
  listAllSyncableMailboxes,
} from "./email-accounts";

const GRAPH_URL = "https://graph.microsoft.com/v1.0";
const ITOPS_BCC = process.env.ITOPS_BCC_EMAIL || "itops@synergificsoftware.com";
const UNSUBSCRIBE_EMAIL = "cloud@synergificsoftware.com";

/**
 * Build the unsubscribe footer that gets appended to every outbound marketing email.
 * Having a visible unsubscribe option drastically improves deliverability.
 */
function buildUnsubscribeFooter(recipientEmail: string): string {
  return `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;line-height:1.6;text-align:center;">
  <p style="margin:0;">You are receiving this email because you are a contact of Synergific Software Pvt. Ltd.</p>
  <p style="margin:4px 0 0 0;">
    If you no longer wish to receive these emails, please reply with "UNSUBSCRIBE" or
    <a href="mailto:${UNSUBSCRIBE_EMAIL}?subject=Unsubscribe&body=Please%20unsubscribe%20${encodeURIComponent(recipientEmail)}" style="color:#6b7280;text-decoration:underline;">click here to unsubscribe</a>.
  </p>
  <p style="margin:4px 0 0 0;">Synergific Software Pvt. Ltd. · Bengaluru, India</p>
</div>`;
}

/**
 * Build deliverability-improving internet message headers.
 * Uses mailto-based List-Unsubscribe (RFC 2369) so no external domain is needed.
 */
function buildDeliverabilityHeaders(recipientEmail: string): Array<{ name: string; value: string }> {
  return [
    {
      name: "List-Unsubscribe",
      value: `<mailto:${UNSUBSCRIBE_EMAIL}?subject=Unsubscribe%20${encodeURIComponent(recipientEmail)}>`,
    },
    {
      name: "List-Unsubscribe-Post",
      value: "List-Unsubscribe=One-Click",
    },
    {
      name: "X-Auto-Response-Suppress",
      value: "OOF, AutoReply",
    },
  ];
}

export function parseTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`);
}

/**
 * Build the effective CC list for an outbound email:
 *   - any explicit CC addresses passed by the caller
 *   - the sender user's own email (so the thread shows up in their personal inbox)
 *
 * Dedupes case-insensitively and removes the primary recipient if accidentally included.
 */
async function buildAutoCcList(
  explicitCc: string | string[] | undefined,
  senderUserId: string | null | undefined,
  toAddress: string
): Promise<string[]> {
  const list: string[] = [];
  if (explicitCc) {
    list.push(...(Array.isArray(explicitCc) ? explicitCc : [explicitCc]));
  }
  if (senderUserId) {
    const sender = await prisma.user.findUnique({
      where: { id: senderUserId },
      select: { email: true },
    });
    if (sender?.email) list.push(sender.email);
  }
  // Dedupe case-insensitively, drop empty + the "to" address
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const addr = raw.trim();
    if (!addr) continue;
    const key = addr.toLowerCase();
    if (key === toAddress.toLowerCase()) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(addr);
  }
  return out;
}

/**
 * Build the BCC list for an outbound email. Always includes the IT Operations
 * mailbox so they get a silent copy of every message the platform sends.
 * Excludes any address that's already in to/cc to avoid duplicate delivery.
 */
function buildAutoBccList(toAddress: string, ccList: string[]): string[] {
  const blocklist = new Set<string>([
    toAddress.toLowerCase(),
    ...ccList.map((c) => c.toLowerCase()),
  ]);
  if (blocklist.has(ITOPS_BCC.toLowerCase())) return [];
  return [ITOPS_BCC];
}

/**
 * Send an email. If `senderUserId` is provided and that user has a connected
 * mailbox, the email is sent FROM their account via delegated permissions.
 * Otherwise it falls back to the shared marketing mailbox (app-only).
 */
/** Attachment ready to send via Graph API */
export interface EmailAttachment {
  name: string;
  contentType: string;
  contentBytes: string; // base64-encoded file content
  size: number;
}

export async function sendEmail({
  to,
  cc,
  subject,
  body,
  contactId,
  replyTo,
  inReplyTo,
  templateId,
  followUpExecId,
  autoFollowUp,
  senderUserId,
  skipAutoCcBcc,
  attachments,
}: {
  to: string;
  cc?: string | string[];
  subject: string;
  body: string;
  contactId: string;
  replyTo?: string;
  inReplyTo?: string;
  templateId?: string;
  followUpExecId?: string;
  autoFollowUp?: boolean;
  senderUserId?: string | null;
  skipAutoCcBcc?: boolean;
  attachments?: EmailAttachment[];
}) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  try {
    const ctx = await getSendingContext(senderUserId);
    const ccList = skipAutoCcBcc
      ? cc ? (Array.isArray(cc) ? cc : [cc]) : []
      : await buildAutoCcList(cc, senderUserId, to);
    const bccList = skipAutoCcBcc ? [] : buildAutoBccList(to, ccList);

    // Create the email record FIRST so we have its ID for tracking.
    // Avoid passing bccAddr + userId in the typed create — stale Prisma
    // client may not know about those columns. We patch them via raw SQL.
    const emailRecord = await prisma.emailMessage.create({
      data: {
        direction: "outbound",
        fromAddr: ctx.fromAddress,
        toAddr: to,
        ccAddr: ccList.length > 0 ? ccList.join(",") : null,
        subject,
        body,
        status: "draft",
        messageId: null,
        inReplyTo: inReplyTo || null,
        contactId,
        templateId: templateId || null,
        followUpExecId: followUpExecId || null,
      },
    });

    // Patch bccAddr + userId via raw SQL (stale-client-safe)
    try {
      const effectiveUserId = senderUserId || ctx.userId || null;
      const effectiveBcc = bccList.length > 0 ? bccList.join(",") : null;
      await prisma.$executeRawUnsafe(
        `UPDATE "EmailMessage" SET "bccAddr" = ?, "userId" = ? WHERE id = ?`,
        effectiveBcc,
        effectiveUserId,
        emailRecord.id
      );
    } catch (e) {
      console.error("[sendEmail] raw patch userId/bccAddr failed:", e);
    }

    // Add unsubscribe footer for deliverability
    const bodyWithFooter = body + buildUnsubscribeFooter(to);

    // Only enable tracking (link rewriting + open pixel) when the tracking
    // domain matches the sending domain. If they differ (e.g. tracking on
    // mail.getlabs.cloud but sending from synergificsoftware.com) it causes
    // a domain mismatch that spam filters treat as phishing.
    const trackingDomain = process.env.TRACKING_DOMAIN || "";
    const senderDomain = ctx.fromAddress.split("@")[1]?.toLowerCase() || "";
    const trackingBaseUrl = trackingDomain || baseUrl;
    const trackingDomainHost = (() => {
      try { return new URL(trackingBaseUrl).hostname.toLowerCase(); } catch { return ""; }
    })();
    const enableTracking = trackingDomainHost.endsWith(senderDomain) || senderDomain.endsWith(trackingDomainHost);

    let trackedBody = bodyWithFooter;
    if (enableTracking) {
      // Rewrite links to go through click tracker
      trackedBody = trackedBody.replace(
        /<a([^>]*?)href=(["'])([^"']+?)\2/gi,
        (match, attrs, quote, url) => {
          if (url.startsWith("mailto:") || url.startsWith("tel:") || url.includes("/api/track/")) {
            return match;
          }
          const tracked = `${trackingBaseUrl}/api/track/click?m=${emailRecord.id}&u=${encodeURIComponent(url)}`;
          return `<a${attrs}href=${quote}${tracked}${quote}`;
        }
      );
      // Open tracking pixel
      trackedBody += `<img src="${trackingBaseUrl}/api/track/open/${emailRecord.id}" width="1" height="1" alt="" style="display:none;" />`;
    }

    // Build Graph API attachments array
    const graphAttachments = (attachments || []).map((a) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: a.name,
      contentType: a.contentType,
      contentBytes: a.contentBytes,
    }));

    const message = {
      message: {
        subject,
        body: { contentType: "HTML", content: trackedBody },
        toRecipients: [{ emailAddress: { address: to } }],
        ...(ccList.length > 0
          ? { ccRecipients: ccList.map((addr) => ({ emailAddress: { address: addr } })) }
          : {}),
        ...(bccList.length > 0
          ? { bccRecipients: bccList.map((addr) => ({ emailAddress: { address: addr } })) }
          : {}),
        ...(replyTo
          ? { replyTo: [{ emailAddress: { address: replyTo } }] }
          : {}),
        ...(graphAttachments.length > 0 ? { attachments: graphAttachments } : {}),
        // Deliverability headers: List-Unsubscribe for inbox placement
        internetMessageHeaders: buildDeliverabilityHeaders(to),
      },
      saveToSentItems: true,
    };

    // Store attachment metadata in DB (not the file content — just name/size/type)
    if (attachments && attachments.length > 0) {
      const meta = attachments.map((a) => ({ name: a.name, size: a.size, type: a.contentType }));
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "EmailMessage" SET "attachments" = ? WHERE id = ?`,
          JSON.stringify(meta),
          emailRecord.id
        );
      } catch {}
    }

    const res = await fetch(`${GRAPH_URL}${ctx.graphUserPath}/sendMail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[sendEmail] Graph API FAILED — to: ${to}, status: ${res.status}, mode: ${ctx.mode}, error: ${errorText}`);
      await prisma.emailMessage.update({
        where: { id: emailRecord.id },
        data: { status: "failed" },
      });

      // If the error is due to internetMessageHeaders, retry without them
      if (errorText.includes("InternetMessageHeader") || errorText.includes("invalidRequest") || res.status === 400) {
        console.log(`[sendEmail] Retrying without custom headers for ${to}...`);
        delete (message.message as Record<string, unknown>).internetMessageHeaders;
        const retryRes = await fetch(`${GRAPH_URL}${ctx.graphUserPath}/sendMail`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ctx.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        });
        if (retryRes.ok) {
          await prisma.emailMessage.update({
            where: { id: emailRecord.id },
            data: { status: "sent", sentAt: new Date() },
          });
          await prisma.contact.update({
            where: { id: contactId },
            data: { lastContactedAt: new Date() },
          });
          if (autoFollowUp && !followUpExecId) {
            const { scheduleAutoFollowUp } = await import("./follow-up");
            await scheduleAutoFollowUp(contactId);
          }
          return { success: true, emailId: emailRecord.id, mode: ctx.mode, from: ctx.fromAddress };
        }
        const retryError = await retryRes.text();
        console.error(`[sendEmail] Retry also failed: ${retryRes.status} ${retryError}`);
      }

      throw new Error(`Graph API error (${ctx.mode}): ${res.status} ${errorText}`);
    }

    await prisma.emailMessage.update({
      where: { id: emailRecord.id },
      data: { status: "sent", sentAt: new Date() },
    });

    await prisma.contact.update({
      where: { id: contactId },
      data: { lastContactedAt: new Date() },
    });

    if (autoFollowUp && !followUpExecId) {
      const { scheduleAutoFollowUp } = await import("./follow-up");
      await scheduleAutoFollowUp(contactId);
    }

    return { success: true, emailId: emailRecord.id, mode: ctx.mode, from: ctx.fromAddress };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function sendBulkEmail({
  contactIds,
  subject,
  body,
  templateId,
  senderUserId,
}: {
  contactIds: string[];
  subject: string;
  body: string;
  templateId?: string;
  senderUserId?: string | null;
}) {
  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds } },
  });

  const results = [];
  for (const contact of contacts) {
    const personalizedBody = parseTemplate(body, {
      name: contact.name,
      email: contact.email,
      company: contact.company || "",
    });
    const personalizedSubject = parseTemplate(subject, {
      name: contact.name,
      company: contact.company || "",
    });

    const result = await sendEmail({
      to: contact.email,
      subject: personalizedSubject,
      body: personalizedBody,
      contactId: contact.id,
      templateId,
      senderUserId,
    });
    results.push({ contactId: contact.id, ...result });
  }

  return results;
}

/**
 * Reply to an existing email thread using Microsoft Graph's reply endpoint.
 * Uses the SAME mailbox the original message arrived in (so it stays threaded).
 *
 * If `senderUserId` is provided and the user has a delegated mailbox, the reply
 * goes from /me. Otherwise it goes from the shared mailbox.
 */
export async function replyToEmail({
  graphMessageId,
  body,
  cc,
  contactId,
  senderUserId,
}: {
  graphMessageId: string;
  body: string;
  cc?: string | string[];
  contactId: string;
  senderUserId?: string | null;
}) {
  try {
    const ctx = await getSendingContext(senderUserId);

    // Look up the original sender so we can compute CC/BCC + dedupe
    const origRes0 = await fetch(
      `${GRAPH_URL}${ctx.graphUserPath}/messages/${graphMessageId}?$select=subject,from,internetMessageId`,
      { headers: { Authorization: `Bearer ${ctx.token}` } }
    );
    const orig0 = origRes0.ok ? await origRes0.json() : {};
    const replyToAddr = orig0?.from?.emailAddress?.address || "";

    const ccList = await buildAutoCcList(cc, senderUserId, replyToAddr);
    const bccList = buildAutoBccList(replyToAddr, ccList);

    const replyPayload = {
      message: {
        body: { contentType: "HTML", content: body },
        ...(ccList.length > 0
          ? { ccRecipients: ccList.map((addr) => ({ emailAddress: { address: addr } })) }
          : {}),
        ...(bccList.length > 0
          ? { bccRecipients: bccList.map((addr) => ({ emailAddress: { address: addr } })) }
          : {}),
      },
    };

    const res = await fetch(
      `${GRAPH_URL}${ctx.graphUserPath}/messages/${graphMessageId}/replyAll`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(replyPayload),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Graph reply error (${ctx.mode}): ${res.status} ${errorText}`);
    }

    const replySubject = orig0?.subject?.toLowerCase().startsWith("re:")
      ? orig0.subject
      : `Re: ${orig0?.subject || "Our conversation"}`;

    const emailRecord = await prisma.emailMessage.create({
      data: {
        direction: "outbound",
        fromAddr: ctx.fromAddress,
        toAddr: replyToAddr,
        ccAddr: ccList.length > 0 ? ccList.join(",") : null,
        subject: replySubject,
        body,
        status: "sent",
        messageId: null,
        inReplyTo: orig0?.internetMessageId || graphMessageId,
        sentAt: new Date(),
        contactId,
      },
    });

    // Patch bccAddr + userId via raw SQL (stale-client-safe)
    try {
      const effectiveUserId = senderUserId || ctx.userId || null;
      const effectiveBcc = bccList.length > 0 ? bccList.join(",") : null;
      await prisma.$executeRawUnsafe(
        `UPDATE "EmailMessage" SET "bccAddr" = ?, "userId" = ? WHERE id = ?`,
        effectiveBcc,
        effectiveUserId,
        emailRecord.id
      );
    } catch {}

    await prisma.contact.update({
      where: { id: contactId },
      data: { lastContactedAt: new Date() },
    });

    return { success: true, emailId: emailRecord.id, mode: ctx.mode };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function testGraphConnection() {
  const from = process.env.SMTP_FROM || "cloud@synergificsoftware.com";
  const token = await getSharedMailboxAppToken();

  const res = await fetch(`${GRAPH_URL}/users/${from}?$select=displayName,mail`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text()}`);
  }

  return await res.json();
}

interface GraphMessage {
  id: string;
  conversationId?: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
  from?: { emailAddress?: { address?: string; name?: string } };
  toRecipients?: { emailAddress?: { address?: string } }[];
  receivedDateTime?: string;
  isRead?: boolean;
  internetMessageId?: string;
}

// Global sync lock to prevent concurrent syncs from producing duplicate replies
let syncLock = false;

/**
 * Sync inbound emails from a SINGLE mailbox. Internal helper used by both
 * the shared-mailbox sync path and the per-user sync path.
 */
async function syncSingleMailbox({
  graphUserPath,
  token,
  mailboxAddress,
  ownerUserId,
  limit,
}: {
  graphUserPath: string;
  token: string;
  mailboxAddress: string;
  ownerUserId: string | null;
  limit: number;
}) {
  const url = `${GRAPH_URL}${graphUserPath}/mailFolders/inbox/messages?$top=${limit}&$orderby=receivedDateTime desc&$select=id,conversationId,subject,bodyPreview,body,from,toRecipients,receivedDateTime,isRead,internetMessageId`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch inbox for ${mailboxAddress}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const messages: GraphMessage[] = data.value || [];

  let synced = 0;
  let skipped = 0;
  let unmatched = 0;

  for (const msg of messages) {
    const senderEmail = msg.from?.emailAddress?.address?.toLowerCase();
    if (!senderEmail) continue;

    if (senderEmail === mailboxAddress.toLowerCase()) {
      skipped++;
      continue;
    }

    // Dedup: check if this Graph message ID was already imported
    const existing = await prisma.emailMessage.findFirst({
      where: { messageId: msg.id },
    });
    if (existing) {
      skipped++;
      continue;
    }

    // Double-check with a raw SQL count to prevent race conditions
    // between concurrent sync calls
    try {
      const dupeCheck = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
        `SELECT COUNT(*) as cnt FROM "EmailMessage" WHERE "messageId" = ?`,
        msg.id
      );
      if (dupeCheck[0]?.cnt > 0) {
        skipped++;
        continue;
      }
    } catch {}

    const contact = await prisma.contact.findFirst({
      where: { email: { equals: senderEmail } },
    });
    if (!contact) {
      unmatched++;
      continue;
    }

    const lastOutbound = await prisma.emailMessage.findFirst({
      where: { contactId: contact.id, direction: "outbound" },
      orderBy: { sentAt: "desc" },
    });

    const replyBody = msg.body?.content || msg.bodyPreview || "";

    let classification: string | null = null;
    let summary: string | null = null;
    let suggestedReply: string | null = null;
    try {
      const { classifyReply } = await import("./ai");
      const result = await classifyReply({
        customerName: contact.name,
        customerCompany: contact.company,
        originalSubject: lastOutbound?.subject || "Our outreach email",
        originalBody: lastOutbound?.body || "",
        replyBody,
      });
      classification = result.classification;
      summary = result.summary;
      suggestedReply = result.suggestedReply;
    } catch (e) {
      console.error("[sync] AI classification failed:", e);
    }

    const inboundRecord = await prisma.emailMessage.create({
      data: {
        direction: "inbound",
        fromAddr: senderEmail,
        toAddr: mailboxAddress,
        subject: msg.subject || "(no subject)",
        body: replyBody,
        status: "delivered",
        messageId: msg.id,
        sentAt: msg.receivedDateTime ? new Date(msg.receivedDateTime) : new Date(),
        contactId: contact.id,
        aiClassification: classification,
        aiSummary: summary,
      },
    });

    // Patch userId via raw SQL (stale-client-safe)
    if (ownerUserId) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "EmailMessage" SET "userId" = ? WHERE id = ?`,
          ownerUserId,
          inboundRecord.id
        );
      } catch {}
    }

    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastContactedAt: new Date() },
    });

    const { cancelActiveFollowUpsForContact } = await import("./follow-up");
    await cancelActiveFollowUpsForContact(contact.id);

    if (suggestedReply && classification) {
      // itops is auto-BCC'd on every reply via the global BCC rule.
      const replyResult = await replyToEmail({
        graphMessageId: msg.id,
        body: suggestedReply,
        contactId: contact.id,
        senderUserId: ownerUserId,
      });

      if (replyResult.success) {
        await prisma.emailMessage.update({
          where: { id: inboundRecord.id },
          data: { aiReplied: true },
        });
      }

      if (classification === "positive") {
        try {
          const { autoCreateDealFromReply } = await import("./sales");
          await autoCreateDealFromReply({
            contactId: contact.id,
            replySubject: msg.subject || "Inbound interest",
            contactName: contact.name,
          });
        } catch (e) {
          console.error("[sync] Auto-deal creation failed:", e);
        }
      }
    }

    synced++;
  }

  return { synced, skipped, unmatched, total: messages.length };
}

/**
 * Sync inbound emails. By default syncs the shared mailbox AND every active
 * per-user connected mailbox. Pass `userId` to sync only one user's mailbox.
 */
export async function syncInboxFromGraph(limit = 50, userId?: string) {
  // Prevent concurrent syncs — if one is already running, skip
  if (syncLock) {
    return { synced: 0, skipped: 0, unmatched: 0, total: 0, mailboxes: 0, errors: [{ mailbox: "all", error: "Sync already in progress" }] };
  }
  syncLock = true;
  try {

  const totals = { synced: 0, skipped: 0, unmatched: 0, total: 0, mailboxes: 0 };
  const errors: { mailbox: string; error: string }[] = [];

  // 1. Sync shared mailbox unless a specific userId was requested
  if (!userId) {
    try {
      const sharedToken = await getSharedMailboxAppToken();
      const sharedFrom = process.env.SMTP_FROM || "cloud@synergificsoftware.com";
      const result = await syncSingleMailbox({
        graphUserPath: `/users/${sharedFrom}`,
        token: sharedToken,
        mailboxAddress: sharedFrom,
        ownerUserId: null,
        limit,
      });
      totals.synced += result.synced;
      totals.skipped += result.skipped;
      totals.unmatched += result.unmatched;
      totals.total += result.total;
      totals.mailboxes++;
    } catch (e) {
      errors.push({ mailbox: "shared", error: String(e) });
    }
  }

  // 2. Sync per-user connected mailboxes
  const accounts = await listAllSyncableMailboxes();
  const filtered = userId ? accounts.filter((a) => a.userId === userId) : accounts;

  for (const account of filtered) {
    try {
      const token = await getValidAccessToken(account);
      const result = await syncSingleMailbox({
        graphUserPath: "/me",
        token,
        mailboxAddress: account.emailAddress,
        ownerUserId: account.userId,
        limit,
      });
      totals.synced += result.synced;
      totals.skipped += result.skipped;
      totals.unmatched += result.unmatched;
      totals.total += result.total;
      totals.mailboxes++;
      await prisma.emailAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date(), lastError: null },
      });
    } catch (e) {
      errors.push({ mailbox: account.emailAddress, error: String(e) });
      await prisma.emailAccount.update({
        where: { id: account.id },
        data: { lastError: String(e).slice(0, 500) },
      });
    }
  }

  return { ...totals, errors };
  } finally {
    syncLock = false;
  }
}
