import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import bcrypt from "bcryptjs";
import { logAction } from "@/lib/audit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user)) return NextResponse.json([], { status: 403 });
    const invites = await prisma.teamInvite.findMany({
      orderBy: { createdAt: "desc" },
      include: { invitedBy: { select: { name: true } } },
    });
    return NextResponse.json(invites);
  } catch (e) {
    console.error("[/api/enterprise/team/invite GET]", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { email, role, password, name } = await req.json();

    // Direct create: if password and name provided, create user directly
    if (password && name) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "User already exists" }, { status: 400 });
      }
      const hashed = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: { name, email, password: hashed, role: role || "agent" },
      });

      logAction({ userId: user.id, action: "team.create_member", entity: "user", entityId: newUser.id, details: { name, email, role: role || "agent" } }).catch(() => {});

      return NextResponse.json({ user: newUser, method: "direct" });
    }

    // Invite flow
    const invite = await prisma.teamInvite.create({
      data: { email, role: role || "agent", invitedById: user.id },
    });

    logAction({ userId: user.id, action: "team.invite", entity: "team_invite", entityId: invite.id, details: { email, role: role || "agent" } }).catch(() => {});

    return NextResponse.json(invite);
  } catch (e) {
    console.error("[/api/enterprise/team/invite POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
