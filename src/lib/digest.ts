import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { logAction } from "./audit";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_AGO = () => new Date(Date.now() - ONE_WEEK_MS);

interface DigestStats {
  ownedLeads: number;
  staleLeads: number; // not contacted in 7+ days
  openTasks: number;
  overdueTasks: number;
  activeDeals: number;
  pipelineValue: number;
  unrepliedInbound: number;
}

async function buildDigest(userId: string): Promise<DigestStats> {
  const sevenDaysAgo = SEVEN_DAYS_AGO();

  const [
    ownedLeads,
    staleLeads,
    openTasks,
    overdueTasks,
    activeDeals,
    unrepliedInbound,
  ] = await Promise.all([
    prisma.contact.count({
      where: { ownerId: userId, status: "lead" },
    }),
    prisma.contact.count({
      where: {
        ownerId: userId,
        status: "lead",
        OR: [
          { lastContactedAt: null },
          { lastContactedAt: { lt: sevenDaysAgo } },
        ],
      },
    }),
    prisma.task.count({
      where: { userId, done: false },
    }),
    prisma.task.count({
      where: {
        userId,
        done: false,
        dueDate: { lt: new Date() },
      },
    }),
    prisma.deal.findMany({
      where: { ownerId: userId, stage: { notIn: ["won", "lost"] } },
      select: { value: true },
    }),
    prisma.emailMessage.count({
      where: { userId, direction: "inbound", aiReplied: false },
    }),
  ]);

  const pipelineValue = activeDeals.reduce((sum, d) => sum + d.value, 0);

  return {
    ownedLeads,
    staleLeads,
    openTasks,
    overdueTasks,
    activeDeals: activeDeals.length,
    pipelineValue,
    unrepliedInbound,
  };
}

function buildDigestHtml(userName: string, stats: DigestStats): string {
  const greet = userName.split(" ")[0] || "there";
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f8fb;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);padding:24px;color:#fff;">
      <h1 style="margin:0;font-size:20px;font-weight:700;">Your weekly digest</h1>
      <p style="margin:4px 0 0;opacity:0.9;font-size:13px;">Hi ${greet}, here's your snapshot for the week.</p>
    </div>

    <div style="padding:24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="50%" style="padding:8px;">
            <div style="background:#f6f8fb;border-radius:8px;padding:14px;">
              <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Owned leads</div>
              <div style="font-size:28px;font-weight:700;color:#0f172a;margin-top:4px;">${stats.ownedLeads}</div>
              ${stats.staleLeads > 0 ? `<div style="font-size:11px;color:#dc2626;margin-top:4px;">⚠ ${stats.staleLeads} not contacted in 7+ days</div>` : ""}
            </div>
          </td>
          <td width="50%" style="padding:8px;">
            <div style="background:#f6f8fb;border-radius:8px;padding:14px;">
              <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Active deals</div>
              <div style="font-size:28px;font-weight:700;color:#0f172a;margin-top:4px;">${stats.activeDeals}</div>
              <div style="font-size:11px;color:#16a34a;margin-top:4px;">₹${stats.pipelineValue.toLocaleString("en-IN")} pipeline</div>
            </div>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding:8px;">
            <div style="background:#f6f8fb;border-radius:8px;padding:14px;">
              <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Open tasks</div>
              <div style="font-size:28px;font-weight:700;color:#0f172a;margin-top:4px;">${stats.openTasks}</div>
              ${stats.overdueTasks > 0 ? `<div style="font-size:11px;color:#dc2626;margin-top:4px;">⚠ ${stats.overdueTasks} overdue</div>` : ""}
            </div>
          </td>
          <td width="50%" style="padding:8px;">
            <div style="background:#f6f8fb;border-radius:8px;padding:14px;">
              <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Unreplied inbound</div>
              <div style="font-size:28px;font-weight:700;color:#0f172a;margin-top:4px;">${stats.unrepliedInbound}</div>
              <div style="font-size:11px;color:#64748b;margin-top:4px;">customer replies</div>
            </div>
          </td>
        </tr>
      </table>

      <div style="margin-top:24px;padding:14px;background:#fef3c7;border-left:3px solid #f59e0b;border-radius:6px;font-size:13px;color:#78350f;">
        <strong>This week's focus:</strong>
        ${stats.staleLeads > 0
          ? `Reach out to your ${stats.staleLeads} stale leads.`
          : stats.overdueTasks > 0
          ? `Clear your ${stats.overdueTasks} overdue tasks.`
          : stats.unrepliedInbound > 0
          ? `Reply to ${stats.unrepliedInbound} pending customer messages.`
          : "Great job — you're on top of everything!"}
      </div>

      <div style="margin-top:20px;text-align:center;">
        <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard" style="display:inline-block;padding:10px 22px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">Open dashboard</a>
      </div>
    </div>

    <div style="padding:16px 24px;background:#f6f8fb;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
      Synergific Software · Weekly digest · ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
    </div>
  </div>
</body></html>`;
}

/**
 * Build the digest HTML + stats for a single user without sending. Used by the
 * admin preview endpoint.
 */
export async function buildDigestPreview(userId: string): Promise<{
  html: string;
  stats: DigestStats;
  user: { id: string; name: string; email: string };
} | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) return null;
  const stats = await buildDigest(userId);
  const html = buildDigestHtml(user.name, stats);
  return { html, stats, user };
}

/**
 * Process weekly digests for all active users who haven't received one in the
 * last 7 days. Skips users with no activity (zero leads + zero deals + zero
 * tasks). Records send markers in AuditLog so we don't double-send.
 */
export async function processWeeklyDigests() {
  const sevenDaysAgo = SEVEN_DAYS_AGO();

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
  });

  const sent: { userId: string; email: string }[] = [];
  const skipped: { userId: string; reason: string }[] = [];

  for (const user of users) {
    // Check most recent digest send marker
    const lastSent = await prisma.auditLog.findFirst({
      where: { userId: user.id, action: "digest.sent" },
      orderBy: { createdAt: "desc" },
    });
    if (lastSent && lastSent.createdAt > sevenDaysAgo) {
      skipped.push({ userId: user.id, reason: "sent within last 7 days" });
      continue;
    }

    const stats = await buildDigest(user.id);

    // Skip users with no activity at all
    if (
      stats.ownedLeads === 0 &&
      stats.activeDeals === 0 &&
      stats.openTasks === 0 &&
      stats.unrepliedInbound === 0
    ) {
      skipped.push({ userId: user.id, reason: "no activity" });
      continue;
    }

    const html = buildDigestHtml(user.name, stats);

    // Find or create a "self contact" so the email has a contactId.
    // We use a system contact identified by the user's own email.
    let selfContact = await prisma.contact.findUnique({
      where: { email: user.email },
    });
    if (!selfContact) {
      selfContact = await prisma.contact.create({
        data: {
          name: user.name,
          email: user.email,
          status: "team",
          source: "system",
          ownerId: user.id,
        },
      });
    }

    const result = await sendEmail({
      to: user.email,
      subject: `Your weekly digest — ${stats.ownedLeads} leads · ₹${stats.pipelineValue.toLocaleString("en-IN")} pipeline`,
      body: html,
      contactId: selfContact.id,
      autoFollowUp: false,
      senderUserId: null,
      skipAutoCcBcc: true, // system email — no CC sender, no BCC itops
    });

    if (result.success) {
      await logAction({
        userId: user.id,
        action: "digest.sent",
        entity: "user",
        entityId: user.id,
        details: { stats },
      });
      sent.push({ userId: user.id, email: user.email });
    } else {
      skipped.push({ userId: user.id, reason: `send failed: ${result.error}` });
    }
  }

  return { sent, skipped, totalUsers: users.length };
}
