import { processFollowUps } from "./follow-up";
import { prisma } from "./prisma";
import { sendEmail, parseTemplate, syncInboxFromGraph } from "./email";
import { processWeeklyDigests } from "./digest";
import { checkStuckDeals } from "./stuck-deals";
import { logAction } from "./audit";

// Run schedulers every 5 minutes (in-memory, single instance only)
const INTERVAL_MS = 5 * 60 * 1000;
// Run digest pass at most once per hour (per-user 7-day dedup is inside the digest itself)
const DIGEST_INTERVAL_MS = 60 * 60 * 1000;
// Run stuck-deal check at most once per 6 hours
const STUCK_DEALS_INTERVAL_MS = 6 * 60 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var __followUpSchedulerStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var __lastDigestRunAt: number | undefined;
  // eslint-disable-next-line no-var
  var __lastStuckDealsRunAt: number | undefined;
}

/**
 * Process scheduled emails whose scheduledAt time has passed.
 */
async function processScheduledEmails() {
  const due = await prisma.scheduledEmail.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: new Date() },
    },
  });

  for (const scheduled of due) {
    let contactIds: string[] = [];
    try {
      contactIds = JSON.parse(scheduled.contactIds);
    } catch {
      await prisma.scheduledEmail.update({
        where: { id: scheduled.id },
        data: { status: "failed" },
      });
      continue;
    }

    if (contactIds.length === 0) {
      await prisma.scheduledEmail.update({
        where: { id: scheduled.id },
        data: { status: "failed" },
      });
      continue;
    }

    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds } },
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const contact of contacts) {
      const variables = {
        name: contact.name,
        email: contact.email,
        company: contact.company || "your business",
      };
      const subject = parseTemplate(scheduled.subject, variables);
      const body = parseTemplate(scheduled.body, variables);

      const result = await sendEmail({
        to: contact.email,
        subject,
        body,
        contactId: contact.id,
        templateId: scheduled.templateId || undefined,
        autoFollowUp: scheduled.autoFollowUp,
        senderUserId: scheduled.userId,
      });

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
      }
    }

    await prisma.scheduledEmail.update({
      where: { id: scheduled.id },
      data: {
        status: failedCount === contacts.length ? "failed" : "sent",
        sentAt: new Date(),
        sentCount,
        failedCount,
      },
    });

    console.log(
      `[scheduler] Scheduled email "${scheduled.name}" — ${sentCount} sent, ${failedCount} failed`
    );
  }
}

/**
 * Process scheduled campaigns whose scheduledFor time has passed.
 */
async function processScheduledCampaigns() {
  const due = await prisma.campaign.findMany({
    where: {
      status: "scheduled",
      scheduledFor: { lte: new Date() },
    },
  });

  for (const campaign of due) {
    if (!campaign.subject || !campaign.content) continue;

    // Default audience: all leads (could be extended via campaign.audienceFilter JSON)
    const contacts = await prisma.contact.findMany({
      where: { status: "lead" },
    });

    const useAB = campaign.abTestEnabled && campaign.subjectB;
    let sentCount = 0;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const variables = {
        name: contact.name,
        email: contact.email,
        company: contact.company || "your business",
      };
      const subjectToUse = useAB && i % 2 === 1 ? campaign.subjectB! : campaign.subject;
      const subject = parseTemplate(subjectToUse, variables);
      const body = parseTemplate(campaign.content, variables);

      const result = await sendEmail({
        to: contact.email,
        subject,
        body,
        contactId: contact.id,
        autoFollowUp: true,
        senderUserId: contact.ownerId, // send from the lead owner's mailbox if assigned
      });

      if (result.success) {
        if (result.emailId) {
          await prisma.emailMessage.update({
            where: { id: result.emailId },
            data: { campaignId: campaign.id },
          });
        }
        sentCount++;
      }
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: "active",
        sentAt: new Date(),
        sentCount: { increment: sentCount },
      },
    });

    console.log(`[scheduler] Sent campaign "${campaign.name}" to ${sentCount} contacts`);
  }
}

/**
 * Process active workflows — evaluate triggers and execute actions.
 */
async function processWorkflows() {
  const workflows = await prisma.workflow.findMany({ where: { isActive: true } });
  if (workflows.length === 0) return;

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  for (const wf of workflows) {
    try {
      const conditions = wf.conditions ? JSON.parse(wf.conditions) : {};
      const actions = wf.actions ? JSON.parse(wf.actions) : [];
      if (!actions.length) continue;

      let matchedRecords: Array<{ contactId: string; contactName: string; contactEmail: string; ownerId?: string | null }> = [];

      if (wf.trigger === "contact_created") {
        const contacts = await prisma.contact.findMany({
          where: { createdAt: { gte: wf.lastRunAt || fiveMinAgo }, ...(conditions.status ? { status: conditions.status } : {}), ...(conditions.source ? { source: conditions.source } : {}) },
          select: { id: true, name: true, email: true, ownerId: true },
        });
        matchedRecords = contacts.map((c) => ({ contactId: c.id, contactName: c.name, contactEmail: c.email, ownerId: c.ownerId }));
      } else if (wf.trigger === "deal_stage_changed") {
        const deals = await prisma.deal.findMany({
          where: { updatedAt: { gte: wf.lastRunAt || fiveMinAgo }, ...(conditions.stage ? { stage: conditions.stage } : {}) },
          include: { contact: { select: { id: true, name: true, email: true, ownerId: true } } },
        });
        matchedRecords = deals.filter((d) => d.contact).map((d) => ({ contactId: d.contact!.id, contactName: d.contact!.name, contactEmail: d.contact!.email, ownerId: d.ownerId }));
      } else if (wf.trigger === "lead_score_above") {
        const threshold = conditions.score || 50;
        const contacts = await prisma.contact.findMany({
          where: { leadScore: { gte: threshold }, updatedAt: { gte: wf.lastRunAt || fiveMinAgo } },
          select: { id: true, name: true, email: true, ownerId: true },
        });
        matchedRecords = contacts.map((c) => ({ contactId: c.id, contactName: c.name, contactEmail: c.email, ownerId: c.ownerId }));
      }

      if (matchedRecords.length === 0) continue;

      for (const record of matchedRecords) {
        for (const action of actions) {
          try {
            if (action.type === "send_email" && action.subject && action.body) {
              await sendEmail({ to: record.contactEmail, subject: parseTemplate(action.subject, { name: record.contactName, email: record.contactEmail, company: "" }), body: parseTemplate(action.body, { name: record.contactName, email: record.contactEmail, company: "" }), contactId: record.contactId, senderUserId: record.ownerId });
            } else if (action.type === "create_task" && action.title) {
              const assignTo = record.ownerId || (await prisma.user.findFirst({ where: { role: "admin" }, select: { id: true } }))?.id;
              if (assignTo) await prisma.task.create({ data: { title: parseTemplate(action.title, { name: record.contactName }), description: action.description || null, priority: action.priority || "medium", contactId: record.contactId, userId: assignTo } });
            } else if (action.type === "update_status" && action.status) {
              await prisma.contact.update({ where: { id: record.contactId }, data: { status: action.status } });
            } else if (action.type === "add_tag" && action.tag) {
              const c = await prisma.contact.findUnique({ where: { id: record.contactId }, select: { tags: true } });
              const tags = c?.tags ? c.tags.split(",").map((t) => t.trim()) : [];
              if (!tags.includes(action.tag)) { tags.push(action.tag); await prisma.contact.update({ where: { id: record.contactId }, data: { tags: tags.join(",") } }); }
            } else if (action.type === "notify" && action.message) {
              const uid = record.ownerId || (await prisma.user.findFirst({ where: { role: "admin" }, select: { id: true } }))?.id;
              if (uid) await prisma.notification.create({ data: { userId: uid, type: "workflow", title: `Workflow: ${wf.name}`, message: parseTemplate(action.message, { name: record.contactName }), link: `/contacts/${record.contactId}` } });
            }
          } catch (ae) { console.error(`[workflow] Action failed:`, ae); }
        }
      }

      await prisma.workflow.update({ where: { id: wf.id }, data: { runCount: { increment: matchedRecords.length }, lastRunAt: new Date() } });
      console.log(`[workflow] "${wf.name}" triggered for ${matchedRecords.length} records`);
    } catch (e) { console.error(`[workflow] "${wf.name}" failed:`, e); }
  }
}

export function startFollowUpScheduler() {
  if (globalThis.__followUpSchedulerStarted) return;
  globalThis.__followUpSchedulerStarted = true;

  console.log("[scheduler] Background processors started — running every 5 minutes");

  const tick = async () => {
    try {
      // Auto-clear expired OOO flags
      try {
        const expired = await prisma.user.updateMany({
          where: {
            outOfOffice: true,
            outOfOfficeUntil: { lt: new Date() },
          } as never,
          data: { outOfOffice: false } as never,
        });
        if (expired.count > 0) {
          console.log(`[scheduler] Cleared ${expired.count} expired OOO flags`);
        }
      } catch {}

      // Sync inbound emails from the shared mailbox + any connected per-user mailboxes
      try {
        const syncResult = await syncInboxFromGraph(200);
        if (syncResult.synced > 0) {
          console.log(
            `[scheduler] Synced ${syncResult.synced} inbound emails from ${syncResult.mailboxes} mailbox(es)`
          );
        }
      } catch (e) {
        console.error("[scheduler] Inbox sync failed:", e);
      }

      const followUpResults = await processFollowUps();
      if (followUpResults.length > 0) {
        console.log(`[scheduler] Processed ${followUpResults.length} follow-ups`);
      }
      await processScheduledCampaigns();

      // Process scheduled emails
      try {
        await processScheduledEmails();
      } catch (e) {
        console.error("[scheduler] Scheduled emails processing failed:", e);
      }

      // Weekly digests — invoke at most once per hour, the digest fn handles per-user 7-day dedup
      const lastDigest = globalThis.__lastDigestRunAt || 0;
      if (Date.now() - lastDigest >= DIGEST_INTERVAL_MS) {
        globalThis.__lastDigestRunAt = Date.now();
        try {
          const digestResult = await processWeeklyDigests();
          if (digestResult.sent.length > 0) {
            console.log(`[scheduler] Sent ${digestResult.sent.length} weekly digests`);
          }
        } catch (e) {
          console.error("[scheduler] Digest run failed:", e);
        }
      }

      // Stuck-deal nudges — every 6 hours
      const lastStuck = globalThis.__lastStuckDealsRunAt || 0;
      if (Date.now() - lastStuck >= STUCK_DEALS_INTERVAL_MS) {
        globalThis.__lastStuckDealsRunAt = Date.now();
        try {
          const stuckResult = await checkStuckDeals();
          if (stuckResult.nudged > 0) {
            console.log(`[scheduler] Nudged ${stuckResult.nudged} stuck deals`);
          }
        } catch (e) {
          console.error("[scheduler] Stuck deals run failed:", e);
        }
      }
      // Process workflow triggers — check for contacts/deals matching active workflow conditions
      try {
        await processWorkflows();
      } catch (e) {
        console.error("[scheduler] Workflow processing failed:", e);
      }

    } catch (e) {
      console.error("[scheduler] Run failed:", e);
    }
  };

  // Run immediately on boot
  tick();
  // Then on interval
  setInterval(tick, INTERVAL_MS);
}
