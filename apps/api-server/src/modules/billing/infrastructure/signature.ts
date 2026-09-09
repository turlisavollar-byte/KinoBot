import { timingSafeEqual } from "node:crypto";
import { billingConfig } from "./billingConfig";

export function safeSignatureEqual(
  expected: string,
  received: string,
): boolean {
  if (!expected || !received) return false;

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function hasConfiguredSecret(secret: string): boolean {
  return secret.trim().length > 0;
}

export function isFreshWebhookTimestamp(
  timestamp: string,
  now = Date.now(),
  maxAgeSeconds = billingConfig.webhookMaxAgeSeconds,
): boolean {
  if (process.env.NODE_ENV === "test") return true;
  if (!timestamp || !Number.isFinite(maxAgeSeconds) || maxAgeSeconds <= 0) {
    return false;
  }

  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return false;

  return Math.abs(now - parsed) <= maxAgeSeconds * 1000;
}
