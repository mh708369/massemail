import { NextResponse } from "next/server";
import { buildDigestPreview } from "@/lib/digest";
import { getCurrentUser, isAdmin } from "@/lib/rbac";

/**
 * GET /api/digest/preview?userId=X
 * Returns the digest HTML + stats for a given user, without sending.
 * Admin-only.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  try {
    const preview = await buildDigestPreview(userId);
    if (!preview) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(preview);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
