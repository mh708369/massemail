import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Reset AI classification on a specific email so it can be re-processed
export async function POST(req: Request) {
  const { emailId } = await req.json();

  if (emailId) {
    const updated = await prisma.emailMessage.update({
      where: { id: emailId },
      data: { aiClassification: null, aiSummary: null, aiReplied: false },
    });
    return NextResponse.json({ success: true, email: updated });
  }

  // Reset all inbound emails
  const updated = await prisma.emailMessage.updateMany({
    where: { direction: "inbound" },
    data: { aiClassification: null, aiSummary: null, aiReplied: false },
  });
  return NextResponse.json({ success: true, count: updated.count });
}
