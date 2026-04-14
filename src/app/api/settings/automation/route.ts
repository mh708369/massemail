import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { getAllSettings, setSetting } from "@/lib/settings";
import { logAction } from "@/lib/audit";

/**
 * GET /api/settings/automation — returns all automation config
 * PUT /api/settings/automation — update one or more configs
 *
 * Admin-only.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
    const settings = await getAllSettings();
    return NextResponse.json(settings);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json();

    if (body.followUp) {
      await setSetting("followup_config", body.followUp);
    }
    if (body.stuckDeal) {
      await setSetting("stuck_deal_config", body.stuckDeal);
    }

    logAction({ userId: user.id, action: "settings.update", entity: "settings", details: { keys: Object.keys(body) } }).catch(() => {});

    const updated = await getAllSettings();
    return NextResponse.json({ success: true, ...updated });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
