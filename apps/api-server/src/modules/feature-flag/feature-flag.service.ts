import { desc, eq } from "drizzle-orm";
import { db, featureFlagsTable } from "@workspace/db";
import type {
  FeatureFlag,
  CreateFlagDTO,
  EvaluateResult,
  FlagStatus,
} from "@/modules/feature-flag/feature-flag.types";

const toFeatureFlag = (row: {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: string;
  rolloutPercentage: number | null;
  enabledForUserIds: string[] | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}): FeatureFlag => ({
  id: row.id,
  key: row.key,
  name: row.name,
  description: row.description ?? undefined,
  status: row.status as FlagStatus,
  rolloutPercentage: row.rolloutPercentage ?? undefined,
  enabledForUserIds: row.enabledForUserIds ?? [],
  metadata: row.metadata ?? undefined,
  createdAt: row.createdAt ?? new Date(),
  updatedAt: row.updatedAt ?? new Date(),
});

export class FeatureFlagService {
  async evaluate(key: string, userId?: string): Promise<EvaluateResult> {
    const [flagRow] = await db
      .select()
      .from(featureFlagsTable)
      .where(eq(featureFlagsTable.key, key))
      .limit(1);

    if (!flagRow) return { key, enabled: false, reason: "flag_not_found" };

    const flag = toFeatureFlag(flagRow);

    if (flag.status === "disabled")
      return { key, enabled: false, reason: "disabled" };
    if (flag.status === "enabled")
      return { key, enabled: true, reason: "enabled" };

    if (flag.status === "rollout" && userId) {
      const hash = [...userId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const bucket = hash % 100;
      const enabled = bucket < (flag.rolloutPercentage ?? 0);
      return { key, enabled, reason: `rollout_${flag.rolloutPercentage}%` };
    }

    if (flag.enabledForUserIds?.includes(userId ?? "")) {
      return { key, enabled: true, reason: "allowlist" };
    }

    return { key, enabled: false, reason: "default_off" };
  }

  async list(): Promise<FeatureFlag[]> {
    const rows = await db
      .select()
      .from(featureFlagsTable)
      .orderBy(desc(featureFlagsTable.updatedAt));

    return rows.map((row) => toFeatureFlag(row));
  }

  async upsert(dto: CreateFlagDTO): Promise<FeatureFlag> {
    const now = new Date();
    const payload = {
      key: dto.key,
      name: dto.name,
      description: dto.description ?? null,
      status: (dto.status ?? "disabled") as FlagStatus,
      rolloutPercentage: dto.rolloutPercentage ?? 0,
      enabledForUserIds: [],
      metadata: {},
      updatedAt: now,
    };

    const [row] = await db
      .insert(featureFlagsTable)
      .values(payload)
      .onConflictDoUpdate({
        target: featureFlagsTable.key,
        set: {
          name: dto.name,
          description: dto.description ?? null,
          status: (dto.status ?? "disabled") as FlagStatus,
          rolloutPercentage: dto.rolloutPercentage ?? 0,
          metadata: {},
          updatedAt: now,
        },
      })
      .returning();

    return toFeatureFlag(row);
  }

  async setStatus(key: string, status: FlagStatus): Promise<void> {
    await db
      .update(featureFlagsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(featureFlagsTable.key, key));
  }

  async delete(key: string): Promise<void> {
    await db.delete(featureFlagsTable).where(eq(featureFlagsTable.key, key));
  }
}

export const featureFlagService = new FeatureFlagService();
