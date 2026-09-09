export const PlanTier = {
  FREE: "free",
  BASIC: "basic",
  STANDARD: "standard",
  PREMIUM: "premium",
  FAMILY: "family",
} as const;

export type PlanTierType = (typeof PlanTier)[keyof typeof PlanTier];

export const PlanLimits: Record<PlanTierType, { devices: number; streams: number; quality: string }> = {
  free: { devices: 1, streams: 1, quality: "480p" },
  basic: { devices: 1, streams: 1, quality: "720p" },
  standard: { devices: 2, streams: 2, quality: "1080p" },
  premium: { devices: 4, streams: 4, quality: "4K" },
  family: { devices: 6, streams: 6, quality: "4K" },
};
