import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { classifyReply } from "@/lib/ai";
import { replyToEmail } from "@/lib/email";

/**
 * Re-classify all inbound emails that don't have an AI classification yet,
 * and send auto-responses based on the classification.
 */
export async function POST() {
  // Find inbound emails without a classification
  const emails = await prisma.emailMessage.findMany({
    where: {
      direction: "inbound",
      aiClassification: null,
    },
    include: { contact: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const results = [];

  for (const email of emails) {
    try {
      // Find the most recent outbound to this contact for context
      const lastOutbound = await prisma.emailMessage.findFirst({
        where: {
          contactId: email.contactId,
          direction: "outbound",
          createdAt: { lt: email.createdAt },
        },
        orderBy: { createdAt: "desc" },
      });

      const result = await classifyReply({
        customerName: email.contact.name,
        customerCompany: email.contact.company,
        originalSubject: lastOutbound?.subject || "Our outreach email",
        originalBody: lastOutbound?.body || "",
        replyBody: email.body,
      });

      // Save classification on the inbound email
      await prisma.emailMessage.update({
        where: { id: email.id },
        data: {
          aiClassification: result.classification,
          aiSummary: result.summary,
        },
      });

      if (!email.messageId) {
        results.push({
          emailId: email.id,
          from: email.fromAddr,
          classification: result.classification,
          summary: result.summary,
          autoReplied: false,
          error: "Missing Graph messageId — cannot reply in thread",
        });
        continue;
      }

      // itops is auto-BCC'd globally; reply from whichever mailbox received it
      const sendResult = await replyToEmail({
        graphMessageId: email.messageId,
        body: result.suggestedReply,
        contactId: email.contactId,
        senderUserId: email.userId,
      });

      if (sendResult.success) {
        await prisma.emailMessage.update({
          where: { id: email.id },
          data: { aiReplied: true },
        });
      }

      results.push({
        emailId: email.id,
        from: email.fromAddr,
        classification: result.classification,
        summary: result.summary,
        autoReplied: sendResult.success,
      });
    } catch (error) {
      results.push({
        emailId: email.id,
        from: email.fromAddr,
        error: String(error),
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
