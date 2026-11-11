export const TELEGRAM_MEDIA_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
export const TELEGRAM_MEDIA_SIGNED_URL_TTL_SECONDS = 60 * 60;

export function getTelegramMediaUrlLifetime(
  uploadedAt: Date,
  now = new Date(),
): number | null {
  const secondsUntilRetentionExpiry = Math.floor(
    (uploadedAt.getTime() + TELEGRAM_MEDIA_RETENTION_MS - now.getTime()) / 1000,
  );
  if (secondsUntilRetentionExpiry <= 0) return null;

  return Math.min(
    TELEGRAM_MEDIA_SIGNED_URL_TTL_SECONDS,
    secondsUntilRetentionExpiry,
  );
}
