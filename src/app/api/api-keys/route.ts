import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

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

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "api_key.create", entity: "api_key", entityId: apiKey.id, details: { name } }).catch(() => {});
  }

  // Return the FULL key only once on creation (so user can copy it)
  return NextResponse.json({ ...apiKey, plaintextKey: key });
}
