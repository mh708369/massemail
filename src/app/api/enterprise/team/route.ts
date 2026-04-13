import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        outOfOffice: true,
        outOfOfficeUntil: true,
        backupUserId: true,
      } as never,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (e) {
    // If new fields aren't on stale Prisma client yet, fall back to the older shape
    console.error("[/api/enterprise/team GET]", e);
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  }
}
