import { NextResponse } from "next/server";
import { syncInboxFromGraph } from "@/lib/email";
import { getCurrentUser, isAdmin } from "@/lib/rbac";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "200");
  const scope = searchParams.get("scope"); // "mine" | "all"

  const user = await getCurrentUser();

  // Non-admins always sync only their own mailbox
  // Admins can sync all (default) or their own with ?scope=mine
  const userIdToSync = user && (!isAdmin(user) || scope === "mine") ? user.id : undefined;

  try {
    const result = await syncInboxFromGraph(limit, userIdToSync);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// GET also works to make manual triggering easy
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  const user = await getCurrentUser();
  const userIdToSync = user && (!isAdmin(user) || scope === "mine") ? user.id : undefined;

  try {
    const result = await syncInboxFromGraph(200, userIdToSync);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
