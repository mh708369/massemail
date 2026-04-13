import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";

export async function GET() {
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });
  // Mask all but first 8 chars + last 4
  const masked = keys.map((k) => ({
    ...k,
    key: `${k.key.slice(0, 8)}...${k.key.slice(-4)}`,
  }));
  return NextResponse.json(masked);
}

export async function POST(req: Request) {
  const { name, expiresInDays } = await req.json();

  // Generate a secure random key
  const key = `sk_syn_${crypto.randomBytes(24).toString("hex")}`;

  const expiresAt = expiresInDays
    ? new Date(Date.now() + parseInt(expiresInDays) * 24 * 60 * 60 * 1000)
    : null;

  // Get first user as default owner
  const firstUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

  const apiKey = await prisma.apiKey.create({
    data: {
      name,
      key,
      expiresAt,
      userId: firstUser?.id || null,
    },
  });

  // Return the FULL key only once on creation (so user can copy it)
  return NextResponse.json({ ...apiKey, plaintextKey: key });
}
