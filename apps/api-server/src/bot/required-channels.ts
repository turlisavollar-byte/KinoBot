import { logger } from "@/lib/logger";

const CHANNEL_ID_PATTERN = /^(?:@[A-Za-z0-9_]{5,32}|-100\d{5,})$/;
type RequiredChannelInput = string | number | null | undefined;

function normalizeChannelId(value: string): string {
  return value.startsWith("@") ? `@${value.slice(1).toLowerCase()}` : value;
}

export function parseRequiredChannelIds(value: RequiredChannelInput): string[] {
  if (!value) return [];

  const channelIds = String(value)
    .split(/[,\n;]+/)
    .map((channelId) => channelId.trim())
    .filter(Boolean);

  const invalidChannelId = channelIds.find(
    (channelId) => !CHANNEL_ID_PATTERN.test(channelId),
  );
  if (invalidChannelId) {
    throw new Error(
      `Invalid required channel identifier: ${invalidChannelId}. Use @username or -100... numeric ID.`,
    );
  }

  return deduplicateChannelIds(channelIds.map(normalizeChannelId));
}

function deduplicateChannelIds(channelIds: string[]): string[] {
  return [...new Set(channelIds)];
}

export function safeParseRequiredChannelIds(
  value: RequiredChannelInput,
): string[] {
  if (!value) return [];

  const channelIds = String(value)
    .split(/[,\n;]+/)
    .map((channelId) => channelId.trim())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const channelId of channelIds) {
    if (CHANNEL_ID_PATTERN.test(channelId)) {
      valid.push(normalizeChannelId(channelId));
    } else {
      invalid.push(channelId);
    }
  }

  if (invalid.length > 0) {
    logger.warn(
      { invalid },
      "Invalid required channel identifiers skipped at runtime",
    );
  }

  return deduplicateChannelIds(valid);
}

export function serializeRequiredChannelIds(
  value: RequiredChannelInput,
): string | null {
  const channelIds = parseRequiredChannelIds(value);
  return channelIds.length > 0 ? channelIds.join(",") : null;
}
