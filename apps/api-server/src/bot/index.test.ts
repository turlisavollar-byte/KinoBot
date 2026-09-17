import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStart = vi.fn();
const mockStop = vi.fn();

vi.mock("grammy", () => {
  class MockBot {
    constructor(public token: string) {}

    use() {}

    catch() {}

    async start() {
      mockStart();
      await Promise.resolve();
      return undefined;
    }

    async stop() {
      mockStop();
      return undefined;
    }
  }

  return {
    Bot: MockBot,
    session: () => "session-middleware",
  };
});

vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => [{ botToken: "test-token", isActive: true }],
          }),
        }),
      }),
    }),
  },
  telegramConfigTable: { isActive: "is_active" },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/bot/handlers/start", () => ({ registerStartHandler: vi.fn() }));
vi.mock("@/bot/handlers/catalog", () => ({ registerCatalogHandler: vi.fn() }));
vi.mock("@/bot/handlers/subscription", () => ({
  registerSubscriptionHandler: vi.fn(),
}));
vi.mock("@/bot/handlers/storage", () => ({ registerStorageHandler: vi.fn() }));

import { isBotRunning, startBot } from "./index";

describe("bot lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not start duplicate polling sessions when startBot is called concurrently", async () => {
    await Promise.all([startBot(), startBot()]);

    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(isBotRunning()).toBe(true);
  });
});
