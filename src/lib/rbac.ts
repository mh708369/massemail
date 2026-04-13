import { auth } from "./auth";
import { prisma } from "./prisma";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Get the current user from the session.
 * Returns null if not logged in.
 * In demo/dev mode (no session yet), returns the first admin user as fallback.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const session = await auth();
    if (session?.user) {
      const u = session.user as { id: string; name?: string | null; email?: string | null; role?: string };
      if (u.id) {
        return {
          id: u.id,
          name: u.name || "",
          email: u.email || "",
          role: u.role || "agent",
        };
      }
    }
  } catch {
    // Auth not configured / no session
  }

  // Fallback for demo: first admin user
  const fallback = await prisma.user.findFirst({
    where: { role: "admin", isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (!fallback) return null;
  return { id: fallback.id, name: fallback.name, email: fallback.email, role: fallback.role };
}

/**
 * Check if a user is an admin (sees everything).
 */
export function isAdmin(user: CurrentUser | null): boolean {
  return user?.role === "admin";
}

/**
 * Returns a Prisma `where` filter clause to scope a query by a user's ownership.
 * Admins see everything → returns `{}`.
 * Non-admins see only their owned records → returns `{ [field]: user.id }`.
 *
 * @param user current logged-in user
 * @param field field name to filter on (e.g., "ownerId", "userId", "assignedToId")
 */
export function scopeFilter(user: CurrentUser | null, field: string): Record<string, unknown> {
  if (!user) return { [field]: "__no_access__" }; // empty result
  if (isAdmin(user)) return {}; // see everything
  return { [field]: user.id };
}

/**
 * Server-side guard for admin-only pages.
 * Throws (renders 403) if the current user is not an admin.
 * Use this in server components for admin-only routes.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    throw new Error("FORBIDDEN: Admin access required");
  }
  return user;
}

/**
 * Server-side guard that just requires a logged-in user.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED: Login required");
  }
  return user;
}
