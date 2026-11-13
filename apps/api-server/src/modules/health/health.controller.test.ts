import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbExecute: vi.fn(),
  queueGetCounts: vi.fn(),
  storageCheckBucket: vi.fn(),
  isBotRunning: vi.fn(),
  isTelegramMediaPipelineRunning: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: { execute: mocks.dbExecute },
}));

vi.mock("@/bot/index", () => ({
  isBotRunning: mocks.isBotRunning,
}));

vi.mock("@/infrastructure/queue/bull", () => ({
  queue: { getCounts: mocks.queueGetCounts },
}));

vi.mock("@/infrastructure/storage/minio", () => ({
  storage: { checkBucket: mocks.storageCheckBucket },
}));

vi.mock("@/modules/telegram-media/telegram-media.pipeline", () => ({
  isTelegramMediaPipelineRunning: mocks.isTelegramMediaPipelineRunning,
}));

vi.mock("@/shared/utils/logger", () => ({
  Logger: { getInstance: () => ({ error: vi.fn() }) },
}));

import { HealthController } from "./health.controller";

const originalEnv = {
  redisUrl: process.env.REDIS_URL,
  videoBucket: process.env.VIDEO_BUCKET,
  polling: process.env.TELEGRAM_POLLING_ENABLED,
};

function createResponse(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
}

describe("HealthController", () => {
  beforeEach(() => {
    mocks.dbExecute.mockResolvedValue({});
    mocks.queueGetCounts.mockResolvedValue({});
    mocks.storageCheckBucket.mockResolvedValue(undefined);
    mocks.isBotRunning.mockReturnValue(false);
    mocks.isTelegramMediaPipelineRunning.mockReturnValue(false);
    process.env.REDIS_URL = "redis://localhost:6379";
    delete process.env.VIDEO_BUCKET;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries({
      REDIS_URL: originalEnv.redisUrl,
      VIDEO_BUCKET: originalEnv.videoBucket,
      TELEGRAM_POLLING_ENABLED: originalEnv.polling,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.clearAllMocks();
  });

  it("reports healthy when Telegram polling is intentionally disabled", async () => {
    process.env.TELEGRAM_POLLING_ENABLED = "false";
    const response = createResponse();

    await new HealthController().check({} as Request, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        services: expect.objectContaining({
          telegramMediaPipeline: "stopped",
        }),
      }),
    );
  });

  it("keeps the health check degraded when polling is enabled but the pipeline stopped", async () => {
    process.env.TELEGRAM_POLLING_ENABLED = "true";
    const response = createResponse();

    await new HealthController().check({} as Request, response);

    expect(response.status).toHaveBeenCalledWith(503);
  });
});
