import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Schedule a campaign to send at a future date.
 * Body: { scheduledFor: ISO date string }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { scheduledFor } = await req.json();

  if (!scheduledFor) {
    return NextResponse.json({ error: "scheduledFor is required" }, { status: 400 });
  }

  const date = new Date(scheduledFor);
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (date.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Scheduled date must be in the future" }, { status: 400 });
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      scheduledFor: date,
      status: "scheduled",
    },
  });

  return NextResponse.json({ success: true, campaign });
}

/**
 * Cancel a scheduled campaign.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campaign = await prisma.campaign.update({
    where: { id },
    data: { scheduledFor: null, status: "draft" },
  });

  return NextResponse.json({ success: true, campaign });
}
