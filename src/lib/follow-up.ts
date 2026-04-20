import { prisma } from "./prisma";
import { sendEmail, parseTemplate } from "./email";
import { sendWhatsAppMessage } from "./whatsapp";
import { getFollowUpConfig } from "./settings";

export async function startSequence(contactId: string, sequenceId: string) {
  const sequence = await prisma.followUpSequence.findUnique({
    where: { id: sequenceId },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  if (!sequence || !sequence.isActive || sequence.steps.length === 0) {
    return { success: false, error: "Invalid or inactive sequence" };
  }

  const firstStep = sequence.steps[0];
  const nextRunAt = new Date(Date.now() + firstStep.delayMinutes * 60 * 1000);

  const execution = await prisma.followUpExecution.create({
    data: {
      sequenceId,
      contactId,
      currentStep: 0,
      status: "active",
      nextRunAt,
      startedAt: new Date(),
    },
  });

  return { success: true, executionId: execution.id, nextRunAt };
}

export async function pauseSequence(executionId: string) {
  return prisma.followUpExecution.update({
    where: { id: executionId },
    data: { status: "paused" },
  });
}

export async function cancelSequence(executionId: string) {
  return prisma.followUpExecution.update({
    where: { id: executionId },
    data: { status: "cancelled" },
  });
}

/**
 * Cancel all active follow-up executions for a contact (called when they reply).
 */
export async function cancelActiveFollowUpsForContact(contactId: string) {
  const result = await prisma.followUpExecution.updateMany({
    where: { contactId, status: "active" },
    data: { status: "cancelled", completedAt: new Date() },
  });
  return result.count;
}

/**
 * Get or create the default auto-follow-up sequence.
 *
 * Reads delay days and content from the SystemSetting table so admins can
 * configure it from the UI without touching code. Supports up to 3 follow-up
 * steps (configured via maxFollowUps in settings).
 *
 * The sequence is re-synced with the latest config every time this runs.
 * If the admin changes "5 days" to "3 days", the next email that triggers
 * a follow-up will use 3 days.
 */
export async function getOrCreateDefaultFollowUpSequence() {
  const config = await getFollowUpConfig();
  const seqName = "Auto Follow-up (No Reply)";

  // Build the steps array from config
  const delayDaysForStep = [
    config.delayDays,
    config.secondFollowUpDays,
    config.thirdFollowUpDays,
  ];

  // Look up existing sequence
  let sequence = await prisma.followUpSequence.findFirst({
    where: { triggerEvent: "email_sent_no_reply" },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  // Try to find the "Follow-up — Soft Reminder" template for fallback content
  const followUpTemplate = await prisma.messageTemplate.findFirst({
    where: { name: "Follow-up — Soft Reminder" },
  });

  const stepSubject = config.subject || followUpTemplate?.subject || "Quick Follow-up — Synergific Software";
  const stepBody = config.body || followUpTemplate?.body || "Hi {{name}},\n\nJust following up on my previous email.\n\nBest,\nSynergific Software";

  if (!sequence) {
    // Create fresh
    const stepsToCreate = [];
    for (let i = 0; i < config.maxFollowUps && i < 3; i++) {
      stepsToCreate.push({
        stepOrder: i,
        channel: "email",
        subject: i === 0 ? stepSubject : `Follow-up #${i + 1} — Synergific Software`,
        body: stepBody,
        delayMinutes: (delayDaysForStep[i] || config.delayDays) * 24 * 60,
        templateId: followUpTemplate?.id || null,
      });
    }

    sequence = await prisma.followUpSequence.create({
      data: {
        name: seqName,
        description: `Auto follow-up: ${config.maxFollowUps} steps, first after ${config.delayDays} days. Cancelled when a reply is detected.`,
        isActive: config.enabled,
        triggerEvent: "email_sent_no_reply",
        steps: { create: stepsToCreate },
      },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });

    return sequence;
  }

  // Sequence exists — sync its settings with the latest config
  let needsStepSync = false;

  // Update isActive
  if (sequence.isActive !== config.enabled) {
    await prisma.followUpSequence.update({
      where: { id: sequence.id },
      data: { isActive: config.enabled },
    });
    sequence.isActive = config.enabled;
  }

  // Check if step count or delays changed
  if (sequence.steps.length !== Math.min(config.maxFollowUps, 3)) {
    needsStepSync = true;
  } else {
    for (let i = 0; i < sequence.steps.length; i++) {
      const expectedDelay = (delayDaysForStep[i] || config.delayDays) * 24 * 60;
      if (sequence.steps[i].delayMinutes !== expectedDelay) {
        needsStepSync = true;
        break;
      }
    }
  }

  if (needsStepSync) {
    // Delete old steps and recreate
    await prisma.followUpStep.deleteMany({ where: { sequenceId: sequence.id } });
    const newSteps = [];
    for (let i = 0; i < config.maxFollowUps && i < 3; i++) {
      newSteps.push({
        sequenceId: sequence.id,
        stepOrder: i,
        channel: "email",
        subject: i === 0 ? stepSubject : `Follow-up #${i + 1} — Synergific Software`,
        body: stepBody,
        delayMinutes: (delayDaysForStep[i] || config.delayDays) * 24 * 60,
        templateId: followUpTemplate?.id || null,
      });
    }
    await prisma.followUpStep.createMany({ data: newSteps });

    // Re-fetch with updated steps
    sequence = await prisma.followUpSequence.findUnique({
      where: { id: sequence.id },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });
  }

  return sequence!;
}

/**
 * Schedule an auto-follow-up for a contact after sending an email.
 * Returns the execution ID, or null if follow-ups are disabled or one is already active.
 */
export async function scheduleAutoFollowUp(contactId: string) {
  // Check if follow-ups are enabled in settings
  const config = await getFollowUpConfig();
  if (!config.enabled) return null;

  // Don't create duplicate active follow-ups
  const existing = await prisma.followUpExecution.findFirst({
    where: { contactId, status: "active" },
  });
  if (existing) return existing.id;

  const sequence = await getOrCreateDefaultFollowUpSequence();
  if (!sequence || !sequence.isActive) return null;

  const result = await startSequence(contactId, sequence.id);
  return result.success ? result.executionId : null;
}

export async function processFollowUps() {
  const dueExecutions = await prisma.followUpExecution.findMany({
    where: {
      status: "active",
      nextRunAt: { lte: new Date() },
    },
    include: {
      sequence: { include: { steps: { orderBy: { stepOrder: "asc" }, include: { template: true } } } },
      contact: true,
    },
  });

  const results = [];

  for (const exec of dueExecutions) {
    const step = exec.sequence.steps[exec.currentStep];
    if (!step) {
      await prisma.followUpExecution.update({
        where: { id: exec.id },
        data: { status: "completed", completedAt: new Date() },
      });
      continue;
    }

    const variables: Record<string, string> = {
      name: exec.contact.name,
      email: exec.contact.email,
      company: exec.contact.company || "your organization",
    };

    const body = parseTemplate(step.template?.body || step.body || "", variables);
    const subject = parseTemplate(step.template?.subject || step.subject || "Follow-up", variables);

    let sendResult: { success: boolean; error?: string } = { success: false, error: "Unknown channel" };

    if (step.channel === "email" || step.channel === "both") {
      sendResult = await sendEmail({
        to: exec.contact.email,
        subject,
        body,
        contactId: exec.contact.id,
        templateId: step.templateId || undefined,
        followUpExecId: exec.id,
        senderUserId: exec.contact.ownerId, // send from the lead owner's mailbox
      });
    }

    if (step.channel === "whatsapp" || step.channel === "both") {
      const phone = exec.contact.whatsappPhone || exec.contact.phone;
      if (phone) {
        sendResult = await sendWhatsAppMessage({
          phone,
          content: body.replace(/<[^>]*>/g, ""), // strip HTML for WhatsApp
          contactId: exec.contact.id,
          templateId: step.templateId || undefined,
          followUpExecId: exec.id,
          senderUserId: exec.contact.ownerId, // tag sender as the lead owner
        });
      }
    }

    const nextStepIndex = exec.currentStep + 1;
    const nextStep = exec.sequence.steps[nextStepIndex];

    if (nextStep) {
      const nextRunAt = new Date(Date.now() + nextStep.delayMinutes * 60 * 1000);
      await prisma.followUpExecution.update({
        where: { id: exec.id },
        data: { currentStep: nextStepIndex, nextRunAt },
      });
    } else {
      await prisma.followUpExecution.update({
        where: { id: exec.id },
        data: { status: "completed", completedAt: new Date() },
      });
    }

    results.push({ executionId: exec.id, step: exec.currentStep, sendResult });
  }

  return results;
}
