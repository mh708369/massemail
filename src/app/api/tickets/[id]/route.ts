import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { logAction } from "@/lib/audit";

// SLA targets in minutes by priority
const SLA_FIRST_RESPONSE: Record<string, number> = {
  urgent: 15,
  high: 60,
  medium: 240,
  low: 1440,
};
const SLA_RESOLUTION: Record<string, number> = {
  urgent: 240,
  high: 1440,
  medium: 4320,
  low: 10080,
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { contact: true, assignedTo: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Compute SLA status on the fly
  const slaInfo = computeSLA(ticket);
  return NextResponse.json({ ...ticket, sla: slaInfo });
}

function computeSLA(ticket: { priority: string; createdAt: Date; firstResponseAt: Date | null; resolvedAt: Date | null; status: string }) {
  const firstResponseSlaMin = SLA_FIRST_RESPONSE[ticket.priority] || 240;
  const resolutionSlaMin = SLA_RESOLUTION[ticket.priority] || 4320;

  const now = new Date();
  const ageMin = Math.round((now.getTime() - ticket.createdAt.getTime()) / 60000);
  const firstResponseDueAt = new Date(ticket.createdAt.getTime() + firstResponseSlaMin * 60000);
  const resolutionDueAt = new Date(ticket.createdAt.getTime() + resolutionSlaMin * 60000);

  let firstResponseStatus: "met" | "due_soon" | "breached" | "pending" = "pending";
  if (ticket.firstResponseAt) {
    firstResponseStatus = ticket.firstResponseAt <= firstResponseDueAt ? "met" : "breached";
  } else {
    if (now > firstResponseDueAt) firstResponseStatus = "breached";
    else if (now.getTime() > firstResponseDueAt.getTime() - 30 * 60000) firstResponseStatus = "due_soon";
  }

  let resolutionStatus: "met" | "due_soon" | "breached" | "pending" = "pending";
  if (ticket.resolvedAt) {
    resolutionStatus = ticket.resolvedAt <= resolutionDueAt ? "met" : "breached";
  } else if (ticket.status === "resolved" || ticket.status === "closed") {
    resolutionStatus = "met";
  } else {
    if (now > resolutionDueAt) resolutionStatus = "breached";
    else if (now.getTime() > resolutionDueAt.getTime() - 60 * 60000) resolutionStatus = "due_soon";
  }

  return {
    ageMinutes: ageMin,
    firstResponseDueAt: firstResponseDueAt.toISOString(),
    resolutionDueAt: resolutionDueAt.toISOString(),
    firstResponseStatus,
    resolutionStatus,
    breached: firstResponseStatus === "breached" || resolutionStatus === "breached",
  };
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();

  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto-set timestamps based on transitions
  const now = new Date();
  if (!existing.firstResponseAt && (data.status === "in_progress" || data.aiSuggestion)) {
    data.firstResponseAt = now;
  }
  if ((data.status === "resolved" || data.status === "closed") && !existing.resolvedAt) {
    data.resolvedAt = now;
  }

  // Check SLA breach on resolution
  if (data.resolvedAt) {
    const resolutionSlaMin = SLA_RESOLUTION[existing.priority] || 4320;
    const dueAt = new Date(existing.createdAt.getTime() + resolutionSlaMin * 60000);
    if (now > dueAt) data.slaBreached = true;
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data,
    include: { contact: true, assignedTo: true },
  });

  // Notify on assignment
  if (data.assignedToId && data.assignedToId !== existing.assignedToId) {
    try {
      const { notify } = await import("@/lib/notifications");
      await notify({
        userId: data.assignedToId,
        type: "ticket_assigned",
        title: "Ticket assigned to you",
        message: `${ticket.subject} (${existing.priority})`,
        link: `/support/tickets/${id}`,
      });
    } catch (e) {
      console.error("[ticket] Notification failed:", e);
    }
  }

  // Audit log
  const user = await getCurrentUser();
  if (user) {
    const changes: Record<string, unknown> = { subject: ticket.subject };
    if (data.status && data.status !== existing.status) changes.statusChange = { from: existing.status, to: data.status };
    if (data.assignedToId && data.assignedToId !== existing.assignedToId) changes.assignedTo = data.assignedToId;
    if (data.priority && data.priority !== existing.priority) changes.priorityChange = { from: existing.priority, to: data.priority };
    logAction({ userId: user.id, action: "ticket.update", entity: "ticket", entityId: id, details: changes }).catch(() => {});
  }

  return NextResponse.json(ticket);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({ where: { id }, select: { subject: true } });
  await prisma.ticket.delete({ where: { id } });

  const user = await getCurrentUser();
  if (user) {
    logAction({ userId: user.id, action: "ticket.delete", entity: "ticket", entityId: id, details: { subject: ticket?.subject } }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
