import { NextResponse } from "next/server";
import { processFollowUps } from "@/lib/follow-up";

// POST /api/follow-ups/process — process all due follow-ups
export async function POST() {
  const results = await processFollowUps();
  return NextResponse.json({ processed: results.length, results });
}
