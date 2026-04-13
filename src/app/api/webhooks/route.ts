import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";

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

  return NextResponse.json(webhook);
}
