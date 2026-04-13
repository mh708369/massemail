import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("m");
  const url = searchParams.get("u");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    if (messageId) {
      const email = await prisma.emailMessage.findUnique({ where: { id: messageId } });
      if (email) {
        await prisma.emailMessage.update({
          where: { id: messageId },
          data: { status: "clicked", openedAt: email.openedAt || new Date() },
        });

        if (email.campaignId) {
          const campaign = await prisma.campaign.update({
            where: { id: email.campaignId },
            data: { clickCount: { increment: 1 } },
          });
          if (campaign.sentCount > 0) {
            await prisma.campaign.update({
              where: { id: email.campaignId },
              data: { clickRate: (campaign.clickCount / campaign.sentCount) * 100 },
            });
          }
        }
      }
    }
  } catch {
    // Silent fail — always redirect
  }

  // Redirect to the original URL
  return NextResponse.redirect(url, 302);
}
