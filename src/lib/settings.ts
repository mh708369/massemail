import { prisma } from "./prisma";

/**
 * System-wide configurable settings stored in the SystemSetting table.
 * Each setting has a typed default so the app always works even before
 * anyone opens the Settings page.
 */

export interface FollowUpConfig {
  enabled: boolean;
  delayDays: number;           // days to wait before first follow-up
  maxFollowUps: number;        // max follow-up emails per contact per sequence
  secondFollowUpDays: number;  // days after first follow-up for second
  thirdFollowUpDays: number;   // days after second for third
  subject: string;             // default follow-up subject
  body: string;                // default follow-up body (supports {{name}}, {{company}})
}

const DEFAULT_FOLLOWUP_CONFIG: FollowUpConfig = {
  enabled: true,
  delayDays: 5,
  maxFollowUps: 3,
  secondFollowUpDays: 7,
  thirdFollowUpDays: 10,
  subject: "Quick Follow-up — Synergific Software",
  body: `Hi {{name}},

Just following up on my previous email. I wanted to check if you had a chance to review our proposal.

If you have any questions or would like to schedule a quick call, I'd be happy to help.

Looking forward to hearing from you.

Best regards,
Synergific Software Team`,
};

export interface StuckDealConfig {
  enabled: boolean;
  thresholdDays: number;       // days in same stage before nudge
  autoPriority: boolean;       // auto-set high priority for high-value deals
  highValueThreshold: number;  // deal value above which = high priority
}

const DEFAULT_STUCK_DEAL_CONFIG: StuckDealConfig = {
  enabled: true,
  thresholdDays: 14,
  autoPriority: true,
  highValueThreshold: 100000,
};

/**
 * Get a system setting. Returns the parsed value or the default.
 * Uses raw SQL so it works even if the Prisma client is stale.
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
      `SELECT value FROM "SystemSetting" WHERE key = ? LIMIT 1`,
      key
    );
    if (rows.length === 0) return defaultValue;
    return JSON.parse(rows[0].value) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Set a system setting. Creates or updates.
 */
export async function setSetting<T>(key: string, value: T): Promise<void> {
  const jsonValue = JSON.stringify(value);
  try {
    // Upsert via raw SQL
    const existing = await prisma.$queryRawUnsafe<Array<{ key: string }>>(
      `SELECT key FROM "SystemSetting" WHERE key = ? LIMIT 1`,
      key
    );
    if (existing.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE "SystemSetting" SET value = ?, updatedAt = ? WHERE key = ?`,
        jsonValue,
        new Date().toISOString(),
        key
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "SystemSetting" (key, value, updatedAt) VALUES (?, ?, ?)`,
        key,
        jsonValue,
        new Date().toISOString()
      );
    }
  } catch (e) {
    console.error(`[settings] Failed to set ${key}:`, e);
  }
}

/** Typed getters for specific configs */
export async function getFollowUpConfig(): Promise<FollowUpConfig> {
  return getSetting("followup_config", DEFAULT_FOLLOWUP_CONFIG);
}

export async function getStuckDealConfig(): Promise<StuckDealConfig> {
  return getSetting("stuck_deal_config", DEFAULT_STUCK_DEAL_CONFIG);
}

/** Get all settings as a map for the admin UI */
export async function getAllSettings(): Promise<Record<string, unknown>> {
  const followUp = await getFollowUpConfig();
  const stuckDeal = await getStuckDealConfig();
  return { followUp, stuckDeal };
}
