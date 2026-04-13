import { prisma } from "./prisma";

export async function logAction({
  userId,
  action,
  entity,
  entityId,
  details,
  ipAddress,
}: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId: entityId || null,
      details: details ? JSON.stringify(details) : null,
      ipAddress: ipAddress || null,
    },
  });
}
