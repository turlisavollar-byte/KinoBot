export type FlagStatus = "enabled" | "disabled" | "rollout";

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  status: FlagStatus;
  rolloutPercentage?: number;
  enabledForUserIds?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFlagDTO {
  key: string;
  name: string;
  description?: string;
  status?: FlagStatus;
  rolloutPercentage?: number;
}

export interface EvaluateResult {
  key: string;
  enabled: boolean;
  reason: string;
}
