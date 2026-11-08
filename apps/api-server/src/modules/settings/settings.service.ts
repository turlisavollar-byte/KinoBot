import { count, eq, sql } from "drizzle-orm";
import { db, systemSettingsTable, usersTable } from "@workspace/db";
import { Logger } from "@/shared/utils/logger";

export const DEFAULT_TRIAL_DURATION_DAYS = 30;
export const TRIAL_DURATION_SETTING_KEY = "trial_duration_days";
const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const logger = Logger.getInstance("SettingsService");

let cachedTrialDays: { value: number; expiresAt: number } | null = null;

function parseTrialDuration(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 365
    ? parsed
    : DEFAULT_TRIAL_DURATION_DAYS;
}

export async function getSettings(): Promise<Record<string, string | number>> {
  try {
    const settings = await db
      .select({
        key: systemSettingsTable.key,
        value: systemSettingsTable.value,
      })
      .from(systemSettingsTable);

    const result: Record<string, string | number> = Object.fromEntries(
      settings.map(({ key, value }) => [key, value]),
    );
    result[TRIAL_DURATION_SETTING_KEY] = parseTrialDuration(
      String(result[TRIAL_DURATION_SETTING_KEY] ?? ""),
    );
    return result;
  } catch (error) {
    logger.error("Failed to read system settings", { error });
    return { [TRIAL_DURATION_SETTING_KEY]: DEFAULT_TRIAL_DURATION_DAYS };
  }
}

export async function getTrialDurationDays(): Promise<number> {
  if (cachedTrialDays && cachedTrialDays.expiresAt > Date.now()) {
    return cachedTrialDays.value;
  }

  let value = DEFAULT_TRIAL_DURATION_DAYS;
  try {
    const [row] = await db
      .select({ value: systemSettingsTable.value })
      .from(systemSettingsTable)
      .where(eq(systemSettingsTable.key, TRIAL_DURATION_SETTING_KEY))
      .limit(1);
    value = parseTrialDuration(row?.value);
  } catch (error) {
    logger.error("Failed to read trial duration", { error });
  }

  cachedTrialDays = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function setTrialDurationDays(value: number): Promise<number> {
  try {
    await db
      .insert(systemSettingsTable)
      .values({ key: TRIAL_DURATION_SETTING_KEY, value: String(value) })
      .onConflictDoUpdate({
        target: systemSettingsTable.key,
        set: { value: String(value), updatedAt: new Date() },
      });

    cachedTrialDays = null;
    logger.info("Trial duration updated", { value });
    return value;
  } catch (error) {
    logger.error("Failed to update trial duration", { error, value });
    throw error;
  }
}

export async function resetAllTrials(
  days: number,
  onlyExpired: boolean,
  preview: boolean,
): Promise<number> {
  const expiredTrialFilter = sql`${usersTable.trialExpiresAt} IS NULL OR ${usersTable.trialExpiresAt} < NOW()`;

  if (preview) {
    const [result] = onlyExpired
      ? await db
          .select({ count: count() })
          .from(usersTable)
          .where(expiredTrialFilter)
      : await db.select({ count: count() }).from(usersTable);
    return result?.count ?? 0;
  }

  const now = new Date();
  const trialExpiresAt = new Date(now.getTime() + days * DAY_MS);
  const updateQuery = db
    .update(usersTable)
    .set({ trialExpiresAt, updatedAt: now });
  const updatedUsers = onlyExpired
    ? await updateQuery
        .where(expiredTrialFilter)
        .returning({ id: usersTable.id })
    : await updateQuery.returning({ id: usersTable.id });

  return updatedUsers.length;
}
