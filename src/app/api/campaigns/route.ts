import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const campaigns = await prisma.campaign.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(campaigns);
}

export async function POST(req: Request) {
  const data = await req.json();
  const campaign = await prisma.campaign.create({ data });
  return NextResponse.json(campaign);
}
