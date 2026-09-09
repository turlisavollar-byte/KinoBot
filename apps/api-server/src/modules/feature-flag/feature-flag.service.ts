/**
 * Feature Flag Service — STUB
 *
 * TODO: Add `featureFlagsTable` to DB schema.
 * In production, consider LaunchDarkly or Unleash integration.
 */

import type { FeatureFlag, CreateFlagDTO, EvaluateResult, FlagStatus } from "@/modules/feature-flag/feature-flag.types";

// In-memory flag store until DB schema is added
const _flags = new Map<string, FeatureFlag>();

export class FeatureFlagService {
  async evaluate(key: string, userId?: string): Promise<EvaluateResult> {
    const flag = _flags.get(key);
    if (!flag) return { key, enabled: false, reason: "flag_not_found" };

    if (flag.status === "disabled") return { key, enabled: false, reason: "disabled" };
    if (flag.status === "enabled") return { key, enabled: true, reason: "enabled" };

    // Rollout: deterministic per userId
    if (flag.status === "rollout" && userId) {
      const hash = [...userId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const bucket = hash % 100;
      const enabled = bucket < (flag.rolloutPercentage ?? 0);
      return { key, enabled, reason: `rollout_${flag.rolloutPercentage}%` };
    }

    // Check allowlist
    if (flag.enabledForUserIds?.includes(userId ?? "")) {
      return { key, enabled: true, reason: "allowlist" };
    }

    return { key, enabled: false, reason: "default_off" };
  }

  async list(): Promise<FeatureFlag[]> {
    return [..._flags.values()];
  }

  async upsert(dto: CreateFlagDTO): Promise<FeatureFlag> {
    const existing = _flags.get(dto.key);
    const now = new Date();
    const flag: FeatureFlag = {
      id: existing?.id ?? crypto.randomUUID(),
      key: dto.key,
      name: dto.name,
      description: dto.description,
      status: (dto.status ?? "disabled") as FlagStatus,
      rolloutPercentage: dto.rolloutPercentage,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    _flags.set(dto.key, flag);
    return flag;
  }

  async setStatus(key: string, status: FlagStatus): Promise<void> {
    const flag = _flags.get(key);
    if (flag) { flag.status = status; flag.updatedAt = new Date(); }
  }

  async delete(key: string): Promise<void> {
    _flags.delete(key);
  }
}

export const featureFlagService = new FeatureFlagService();
