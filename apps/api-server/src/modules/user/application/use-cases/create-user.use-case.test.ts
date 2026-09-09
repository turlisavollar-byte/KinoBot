import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { CreateUserUseCase } from "./create-user.use-case";

describe("CreateUserUseCase", () => {
  it("provisions user, profile, and stats through one aggregate boundary", async () => {
    const user = {
      id: "user-1",
      telegramId: "telegram-1",
      email: undefined,
      phone: undefined,
      username: "person",
      firstName: undefined,
      lastName: undefined,
      languageCode: "en",
      role: { toString: () => "user" },
      status: { toString: () => "active" },
      isActive: true,
      isBlocked: false,
    };
    const repository = {
      findByTelegramId: vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn().mockResolvedValue(null),
    } as any;
    const provisioningRepository = {
      createUserAggregate: vi.fn().mockResolvedValue(user),
    };
    const eventService = { emit: vi.fn().mockResolvedValue(undefined) };

    const result = await new CreateUserUseCase(
      repository,
      provisioningRepository as any,
      eventService as any,
    ).execute({
      telegramId: "telegram-1",
      username: "person",
    });

    expect(result).toBe(user);
    expect(provisioningRepository.createUserAggregate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: expect.any(String) }),
      expect.objectContaining({ userId: expect.any(String) }),
    );
  });
});
