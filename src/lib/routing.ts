import { prisma } from "./prisma";

interface LeadRoutingRule {
  id: string;
  name: string;
  sourcePattern: string | null;
  domainPattern: string | null;
  tagPattern: string | null;
  assignToUserId: string | null;
  isActive: boolean;
  priority: number;
}

interface RoutingInput {
  source?: string | null;
  email?: string | null;
  tags?: string | null;
}

function caseInsensitiveContains(haystack: string | null | undefined, needle: string | null): boolean {
  if (!needle) return true; // unset rule field = wildcard match
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Pick the best routing rule for a lead. Rules are evaluated in `priority` ASC
 * order; first match wins. Returns the rule's assignToUserId, or null if no
 * rule matches.
 *
 * Wraps in try/catch so a stale Prisma client (model just added via migration)
 * doesn't break the import flow — falls through to round-robin.
 */
export async function pickOwnerByRules(input: RoutingInput): Promise<string | null> {
  try {
    // Use raw SQL so a stale Prisma client doesn't fail to recognize the model
    const rules = await prisma.$queryRawUnsafe<LeadRoutingRule[]>(
      `SELECT id, name, sourcePattern, domainPattern, tagPattern, assignToUserId, isActive, priority
         FROM "LeadRoutingRule"
        WHERE isActive = 1
        ORDER BY priority ASC, createdAt ASC`
    );

    const emailDomain = input.email ? input.email.split("@")[1] || "" : "";

    for (const rule of rules) {
      if (
        caseInsensitiveContains(input.source, rule.sourcePattern) &&
        caseInsensitiveContains(emailDomain, rule.domainPattern) &&
        caseInsensitiveContains(input.tags, rule.tagPattern) &&
        rule.assignToUserId
      ) {
        return rule.assignToUserId;
      }
    }
  } catch {
    // No rules table yet or stale client — return null and let caller round-robin
  }
  return null;
}

interface UserOOORow {
  id: string;
  isActive: number; // sqlite returns 0/1
  outOfOffice: number;
  outOfOfficeUntil: string | null;
  backupUserId: string | null;
}

/**
 * Resolve out-of-office handoff. Given a userId, returns the effective owner:
 *   - if user has outOfOffice = true and a backupUserId, returns backupUserId
 *     (recursively, if the backup is also OOO)
 *   - otherwise returns the original userId
 *
 * Caps recursion at 5 hops to avoid OOO chains becoming infinite loops.
 *
 * Uses raw SQL to dodge stale-Prisma-client failures (the new fields exist in
 * the database via migration but the generated client may not know about them).
 */
export async function resolveEffectiveOwner(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  let currentId: string | null = userId;
  for (let i = 0; i < 5; i++) {
    if (!currentId) return null;
    let row: UserOOORow | undefined;
    try {
      const rows = await prisma.$queryRawUnsafe<UserOOORow[]>(
        `SELECT id, isActive, outOfOffice, outOfOfficeUntil, backupUserId
           FROM "User"
          WHERE id = ?
          LIMIT 1`,
        currentId
      );
      row = rows[0];
    } catch {
      // Truly broken — return whatever we last had
      return currentId;
    }
    if (!row) return null;
    if (!row.isActive) {
      currentId = row.backupUserId;
      continue;
    }
    const oooUntilDate = row.outOfOfficeUntil ? new Date(row.outOfOfficeUntil) : null;
    const ooNow = !!row.outOfOffice && (!oooUntilDate || oooUntilDate > new Date());
    if (!ooNow) return row.id;
    if (!row.backupUserId) return row.id; // OOO but no backup → keep them
    currentId = row.backupUserId;
  }
  return currentId;
}

/**
 * Combined: try routing rules first, fall back to caller-provided default,
 * then resolve OOO on the final result.
 */
export async function pickAndResolveOwner(
  input: RoutingInput,
  fallback: string | null
): Promise<string | null> {
  const fromRules = await pickOwnerByRules(input);
  return resolveEffectiveOwner(fromRules ?? fallback);
}

/**
 * For round-robin assignment: filter out users who are currently OOO without a
 * backup that would just bounce back here. Used by the import path.
 */
export async function filterRoundRobinPool<T extends { id: string }>(
  pool: T[]
): Promise<T[]> {
  if (pool.length === 0) return pool;
  try {
    const ids = pool.map((u) => u.id);
    const placeholders = ids.map(() => "?").join(",");
    const rows = await prisma.$queryRawUnsafe<UserOOORow[]>(
      `SELECT id, isActive, outOfOffice, outOfOfficeUntil, backupUserId
         FROM "User"
        WHERE id IN (${placeholders})`,
      ...ids
    );
    const oooNow = new Set(
      rows
        .filter((u) => {
          if (!u.outOfOffice) return false;
          const until = u.outOfOfficeUntil ? new Date(u.outOfOfficeUntil) : null;
          return !until || until > new Date();
        })
        .map((u) => u.id)
    );
    const filtered = pool.filter((u) => !oooNow.has(u.id));
    return filtered.length > 0 ? filtered : pool;
  } catch {
    // If raw query fails for any reason, return the pool unchanged
    return pool;
  }
}
