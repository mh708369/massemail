import { NextResponse } from "next/server";
import { processWeeklyDigests } from "@/lib/digest";
import { getCurrentUser, isAdmin } from "@/lib/rbac";

/**
 * Manually trigger the weekly digest run.
 * Admin-only — non-admins can't force-send digests to the entire team.
 *
 * The digest processor itself dedupes per-user (won't send if a digest was
 * sent to that user within the last 7 days), so calling this multiple times
 * in a row is safe.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  try {
    const result = await processWeeklyDigests();
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
