import { prisma } from "@/lib/prisma";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(_req: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;

  try {
    const email = await prisma.emailMessage.findUnique({ where: { id: messageId } });
    if (email && !email.openedAt) {
      await prisma.emailMessage.update({
        where: { id: messageId },
        data: { openedAt: new Date(), status: "opened" },
      });

      // Update campaign open count if linked
      if (email.campaignId) {
        const campaign = await prisma.campaign.update({
          where: { id: email.campaignId },
          data: { openCount: { increment: 1 } },
        });
        // Recompute open rate
        if (campaign.sentCount > 0) {
          await prisma.campaign.update({
            where: { id: email.campaignId },
            data: { openRate: (campaign.openCount / campaign.sentCount) * 100 },
          });
        }
      }
    }
  } catch {
    // Silent fail — never break the pixel
  }

  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Pragma": "no-cache",
    },
  });
}
