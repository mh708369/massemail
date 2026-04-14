import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

export async function GET() {
  const webhooks = await prisma.webhook.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(webhooks);
}

export async function POST(req: Request) {
  const { name, url, events } = await req.json();

  const secret = `whsec_${crypto.randomBytes(20).toString("hex")}`;

  const webhook = await prisma.webhook.create({
    data: {
      name,
      url,
      events: Array.isArray(events) ? events.join(",") : events,
      secret,
    },
  });

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "webhook.create", entity: "webhook", entityId: webhook.id, details: { name, url, events } }).catch(() => {});
  }

  return NextResponse.json(webhook);
}
