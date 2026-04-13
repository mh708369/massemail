import { prisma } from "./prisma";

/**
 * Create a notification for a specific user.
 */
export async function notify({
  userId,
  type,
  title,
  message,
  link,
}: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  return prisma.notification.create({
    data: { userId, type, title, message, link: link || null },
  });
}

/**
 * Create a notification for ALL active admin users (broadcast).
 */
export async function notifyAdmins({
  type,
  title,
  message,
  link,
}: {
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  const admins = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["admin"] } },
    select: { id: true },
  });

  return Promise.all(
    admins.map((u) =>
      prisma.notification.create({
        data: { userId: u.id, type, title, message, link: link || null },
      })
    )
  );
}
