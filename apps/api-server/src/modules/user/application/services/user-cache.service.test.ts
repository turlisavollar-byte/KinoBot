import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { UserCacheService } from "./user-cache.service";

describe("UserCacheService", () => {
  it("rehydrates value objects and dates from Redis JSON", async () => {
    const cache = {
      get: vi.fn().mockResolvedValue({
        id: "user-1",
        telegramId: "telegram-1",
        email: "person@example.com",
        phone: "998901234567",
        status: "active",
        role: "user",
        isActive: true,
        isBlocked: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    } as any;

    const user = await new UserCacheService(cache).get("user-1");

    expect(user?.email?.value).toBe("person@example.com");
    expect(user?.status.toString()).toBe("active");
    expect(user?.role.toString()).toBe("user");
    expect(user?.createdAt).toBeInstanceOf(Date);
  });
});
